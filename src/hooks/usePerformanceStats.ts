import { useState, useEffect, useRef, useCallback } from 'react';

import type { ConnectionQuality } from '../lib/types';

// ── Types ──

export interface PerformanceStats {
  fps: number;
  latency: number;           // RTT in ms
  cpu: number;               // estimated CPU usage 0-100
  bitrate: number;           // outbound bps
  resolution: string;        // e.g. "1920×1080"
  packetLoss: number;        // percentage 0-100
  encodeTime: number;        // ms per frame
}

export interface PerViewerStats {
  viewerId: string;
  stats: PerformanceStats;
  quality: ConnectionQuality;
}

interface UsePerformanceStatsProps {
  connectionsRef: React.MutableRefObject<Map<string, RTCPeerConnection>>;
  isActive: boolean;
}

interface UsePerformanceStatsReturn {
  stats: PerformanceStats | null;
  perViewerStats: PerViewerStats[];
}

// ── Defaults ──

const EMPTY_STATS: PerformanceStats = {
  fps: 0,
  latency: 0,
  cpu: 0,
  bitrate: 0,
  resolution: '—',
  packetLoss: 0,
  encodeTime: 0,
};

const POLL_INTERVAL = 1000;

// ── Quality thresholds ──

function qualityFromStats(s: PerformanceStats): ConnectionQuality {
  if (s.packetLoss > 8 || s.fps < 10) return 'bad';
  if (s.packetLoss > 3 || s.fps < 20) return 'degrading';
  return 'healthy';
}

// ── Hook ──

export function usePerformanceStats({
  connectionsRef,
  isActive,
}: UsePerformanceStatsProps): UsePerformanceStatsReturn {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [perViewerStats, setPerViewerStats] = useState<PerViewerStats[]>([]);

  // Track previous report values for delta calculations
  const prevReportsRef = useRef<Map<string, {
    bytesSent: number;
    packetsSent: number;
    packetsLost: number;
    timestamp: number;
    framesEncoded: number;
    totalEncodeTime: number;
  }>>(new Map());

  const pollStats = useCallback(async () => {
    const connections = connectionsRef.current;
    if (connections.size === 0) {
      setStats(null);
      setPerViewerStats([]);
      return;
    }

    const viewerResults: PerViewerStats[] = [];

    for (const [viewerId, pc] of connections) {
      if (pc.connectionState === 'closed') continue;

      try {
        const report = await pc.getStats();
        let fps = 0;
        let latency = 0;
        let bitrate = 0;
        let resolution = '—';
        let packetLoss = 0;
        let encodeTime = 0;
        let cpu = 0;

        let currentBytesSent = 0;
        let currentPacketsSent = 0;
        let currentPacketsLost = 0;
        let currentFramesEncoded = 0;
        let currentTotalEncodeTime = 0;
        let currentTimestamp = 0;

        report.forEach((stat) => {
          // Outbound RTP (video)
          if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
            currentBytesSent = stat.bytesSent || 0;
            currentPacketsSent = stat.packetsSent || 0;
            currentFramesEncoded = stat.framesEncoded || 0;
            currentTotalEncodeTime = stat.totalEncodeTime || 0;
            currentTimestamp = stat.timestamp;
            fps = stat.framesPerSecond || 0;

            if (stat.frameWidth && stat.frameHeight) {
              resolution = `${stat.frameWidth}\u00D7${stat.frameHeight}`;
            }
          }

          // Remote inbound RTP (for packet loss from receiver side)
          if (stat.type === 'remote-inbound-rtp' && stat.kind === 'video') {
            latency = Math.round((stat.roundTripTime || 0) * 1000);
            currentPacketsLost = stat.packetsLost || 0;
          }

          // Candidate pair (for RTT fallback)
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            if (latency === 0 && stat.currentRoundTripTime) {
              latency = Math.round(stat.currentRoundTripTime * 1000);
            }
          }
        });

        // Delta calculations
        const prev = prevReportsRef.current.get(viewerId);
        if (prev && currentTimestamp > prev.timestamp) {
          const elapsed = (currentTimestamp - prev.timestamp) / 1000;

          // Bitrate (bytes delta → bits per second)
          const bytesDelta = currentBytesSent - prev.bytesSent;
          bitrate = Math.round((bytesDelta * 8) / elapsed);

          // Packet loss percentage
          const packetsDelta = currentPacketsSent - prev.packetsSent;
          const lostDelta = currentPacketsLost - prev.packetsLost;
          if (packetsDelta > 0) {
            packetLoss = Math.round((lostDelta / (packetsDelta + lostDelta)) * 10000) / 100;
            packetLoss = Math.max(0, packetLoss);
          }

          // Encode time (ms per frame)
          const framesDelta = currentFramesEncoded - prev.framesEncoded;
          const encodeTimeDelta = currentTotalEncodeTime - prev.totalEncodeTime;
          if (framesDelta > 0) {
            encodeTime = Math.round((encodeTimeDelta / framesDelta) * 1000 * 100) / 100;
          }

          // CPU estimate: encode time relative to frame budget
          if (fps > 0 && encodeTime > 0) {
            const frameBudget = 1000 / fps;
            cpu = Math.round((encodeTime / frameBudget) * 100);
            cpu = Math.min(100, cpu);
          }
        }

        prevReportsRef.current.set(viewerId, {
          bytesSent: currentBytesSent,
          packetsSent: currentPacketsSent,
          packetsLost: currentPacketsLost,
          timestamp: currentTimestamp,
          framesEncoded: currentFramesEncoded,
          totalEncodeTime: currentTotalEncodeTime,
        });

        const viewerStat: PerformanceStats = {
          fps,
          latency,
          cpu,
          bitrate,
          resolution,
          packetLoss,
          encodeTime,
        };

        viewerResults.push({
          viewerId,
          stats: viewerStat,
          quality: qualityFromStats(viewerStat),
        });
      } catch (error) {
        console.error(`[PerfStats] Failed to get stats for ${viewerId}:`, error);
      }
    }

    setPerViewerStats(viewerResults);

    // Aggregate: use worst stats across all connections
    if (viewerResults.length > 0) {
      const aggregated: PerformanceStats = { ...EMPTY_STATS };

      // FPS: minimum across viewers
      aggregated.fps = Math.min(...viewerResults.map(v => v.stats.fps));

      // Latency: maximum (worst)
      aggregated.latency = Math.max(...viewerResults.map(v => v.stats.latency));

      // CPU: maximum (worst)
      aggregated.cpu = Math.max(...viewerResults.map(v => v.stats.cpu));

      // Bitrate: total outbound
      aggregated.bitrate = viewerResults.reduce((sum, v) => sum + v.stats.bitrate, 0);

      // Resolution: from first viewer (all share same source)
      aggregated.resolution = viewerResults[0].stats.resolution;

      // Packet loss: maximum (worst)
      aggregated.packetLoss = Math.max(...viewerResults.map(v => v.stats.packetLoss));

      // Encode time: maximum (worst)
      aggregated.encodeTime = Math.max(...viewerResults.map(v => v.stats.encodeTime));

      setStats(aggregated);
    } else {
      setStats(null);
    }
  }, [connectionsRef]);

  // Poll on interval when active
  useEffect(() => {
    if (!isActive) {
      setStats(null);
      setPerViewerStats([]);
      return;
    }

    pollStats();
    const interval = setInterval(pollStats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isActive, pollStats]);

  // Clean up prev reports on unmount
  useEffect(() => {
    return () => {
      prevReportsRef.current.clear();
    };
  }, []);

  return { stats, perViewerStats };
}

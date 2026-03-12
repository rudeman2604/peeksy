import type { PerformanceStats } from '../hooks/usePerformanceStats';
import type { PeeksySettings } from '../lib/types';

import './PerformanceOverlay.css';

// ── Types ──

interface PerformanceOverlayProps {
  stats: PerformanceStats | null;
  visibleStats: PeeksySettings['performanceStats'];
  connectionColors: PeeksySettings['connectionColors'];
  onClose: () => void;
}

// ── Helpers ──

type HealthLevel = 'healthy' | 'degrading' | 'bad';

function fpsHealth(fps: number): HealthLevel {
  if (fps < 10) return 'bad';
  if (fps < 20) return 'degrading';
  return 'healthy';
}

function latencyHealth(ms: number): HealthLevel {
  if (ms > 300) return 'bad';
  if (ms > 150) return 'degrading';
  return 'healthy';
}

function cpuHealth(pct: number): HealthLevel {
  if (pct > 80) return 'bad';
  if (pct > 50) return 'degrading';
  return 'healthy';
}

function packetLossHealth(pct: number): HealthLevel {
  if (pct > 8) return 'bad';
  if (pct > 3) return 'degrading';
  return 'healthy';
}

function encodeTimeHealth(ms: number): HealthLevel {
  if (ms > 30) return 'bad';
  if (ms > 16) return 'degrading';
  return 'healthy';
}

function formatBitrate(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} kbps`;
  return `${bps} bps`;
}

// ── Component ──

export default function PerformanceOverlay({
  stats,
  visibleStats,
  connectionColors,
  onClose,
}: PerformanceOverlayProps) {
  // Apply connection colors as CSS custom properties
  const colorStyle = {
    '--pk-connection-healthy': connectionColors.healthy,
    '--pk-connection-degrading': connectionColors.degrading,
    '--pk-connection-bad': connectionColors.bad,
  } as React.CSSProperties;

  return (
    <div className="perfOverlay" style={colorStyle}>
      <div className="perfOverlayHeader">
        <span className="perfOverlayTitle">Performance</span>
        <button
          className="perfOverlayClose"
          onClick={onClose}
          type="button"
          aria-label="Close performance overlay"
        >
          {'\u2715'}
        </button>
      </div>

      {!stats ? (
        <div className="perfOverlayEmpty">No active connections</div>
      ) : (
        <div className="perfOverlayStats">
          {visibleStats.fps && (
            <StatRow
              label="FPS"
              value={`${stats.fps}`}
              health={fpsHealth(stats.fps)}
            />
          )}
          {visibleStats.latency && (
            <StatRow
              label="Latency"
              value={`${stats.latency} ms`}
              health={latencyHealth(stats.latency)}
            />
          )}
          {visibleStats.cpu && (
            <StatRow
              label="CPU"
              value={`${stats.cpu}%`}
              health={cpuHealth(stats.cpu)}
            />
          )}
          {visibleStats.bitrate && (
            <StatRow
              label="Bitrate"
              value={formatBitrate(stats.bitrate)}
              health="healthy"
            />
          )}
          {visibleStats.resolution && (
            <StatRow
              label="Resolution"
              value={stats.resolution}
              health="healthy"
            />
          )}
          {visibleStats.packetLoss && (
            <StatRow
              label="Pkt Loss"
              value={`${stats.packetLoss.toFixed(1)}%`}
              health={packetLossHealth(stats.packetLoss)}
            />
          )}
          {visibleStats.encodeTime && (
            <StatRow
              label="Encode"
              value={`${stats.encodeTime.toFixed(1)} ms`}
              health={encodeTimeHealth(stats.encodeTime)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Stat Row ──

function StatRow({
  label,
  value,
  health,
}: {
  label: string;
  value: string;
  health: HealthLevel;
}) {
  return (
    <div className="perfOverlayStat">
      <div className="perfOverlayStatLeft">
        <span className={`perfOverlayDot perfOverlayDot--${health}`} />
        <span className="perfOverlayLabel">{label}</span>
      </div>
      <span className="perfOverlayValue">{value}</span>
    </div>
  );
}

import type { ConnectionQuality } from './types';
import type { PerformanceStats } from '../hooks/usePerformanceStats';

// ── Thresholds ──

export interface QualityThresholds {
  // Degrading thresholds
  degradingPacketLoss: number;   // > this % triggers degrading
  degradingBitrateRatio: number; // < this ratio of expected triggers degrading
  degradingFpsRatio: number;     // < this ratio of expected triggers degrading

  // Bad thresholds
  badPacketLoss: number;
  badBitrateRatio: number;
  badFpsRatio: number;
}

export const DEFAULT_THRESHOLDS: QualityThresholds = {
  degradingPacketLoss: 3,
  degradingBitrateRatio: 0.7,
  degradingFpsRatio: 0.7,

  badPacketLoss: 8,
  badBitrateRatio: 0.4,
  badFpsRatio: 0.4,
};

// ── Smoothing Config ──
// Degrading must persist for 3 consecutive checks (6s at 2s interval)
// Bad must persist for 2 consecutive checks (4s at 2s interval)

export const SMOOTHING = {
  degradingChecks: 3,
  badChecks: 2,
  checkInterval: 2000, // ms
};

// ── Scoring ──

export function scoreQuality(
  stats: PerformanceStats,
  expectedFps: number,
  thresholds: QualityThresholds = DEFAULT_THRESHOLDS,
): ConnectionQuality {
  const fpsRatio = expectedFps > 0 ? stats.fps / expectedFps : 1;

  // Check bad first (more severe)
  if (
    stats.packetLoss > thresholds.badPacketLoss ||
    fpsRatio < thresholds.badFpsRatio
  ) {
    return 'bad';
  }

  // Check degrading
  if (
    stats.packetLoss > thresholds.degradingPacketLoss ||
    fpsRatio < thresholds.degradingFpsRatio
  ) {
    return 'degrading';
  }

  return 'healthy';
}

// ── Suggested preset based on quality ──

export function suggestPreset(quality: ConnectionQuality): string | null {
  switch (quality) {
    case 'bad':
      return 'potato';
    case 'degrading':
      return 'balanced';
    default:
      return null;
  }
}

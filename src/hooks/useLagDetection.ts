import { useState, useEffect, useRef, useCallback } from 'react';

import type { ConnectionQuality, QualityPresetName } from '../lib/types';
import type { PerViewerStats } from './usePerformanceStats';
import { scoreQuality, SMOOTHING, suggestPreset } from '../lib/connectionQuality';

// ── Types ──

interface UseLagDetectionProps {
  perViewerStats: PerViewerStats[];
  expectedFps: number;
  isActive: boolean;
}

interface UseLagDetectionReturn {
  overallQuality: ConnectionQuality;
  perViewerQuality: Map<string, ConnectionQuality>;
  shouldWarn: boolean;
  suggestedPreset: QualityPresetName | null;
  dismissWarning: () => void;
}

// ── Hook ──

export function useLagDetection({
  perViewerStats,
  expectedFps,
  isActive,
}: UseLagDetectionProps): UseLagDetectionReturn {
  const [overallQuality, setOverallQuality] = useState<ConnectionQuality>('healthy');
  const [perViewerQuality, setPerViewerQuality] = useState<Map<string, ConnectionQuality>>(new Map());
  const [shouldWarn, setShouldWarn] = useState(false);

  // Smoothing counters: how many consecutive checks at each level
  const degradingCountRef = useRef(0);
  const badCountRef = useRef(0);
  const warningDismissedRef = useRef(false);
  const lastQualityRef = useRef<ConnectionQuality>('healthy');

  const dismissWarning = useCallback(() => {
    warningDismissedRef.current = true;
    setShouldWarn(false);
  }, []);

  // Run quality checks on interval
  useEffect(() => {
    if (!isActive) {
      setOverallQuality('healthy');
      setPerViewerQuality(new Map());
      setShouldWarn(false);
      degradingCountRef.current = 0;
      badCountRef.current = 0;
      return;
    }

    const checkQuality = () => {
      if (perViewerStats.length === 0) {
        degradingCountRef.current = 0;
        badCountRef.current = 0;
        setOverallQuality('healthy');
        setPerViewerQuality(new Map());
        setShouldWarn(false);
        return;
      }

      // Score each viewer
      const viewerQualities = new Map<string, ConnectionQuality>();
      let worstRaw: ConnectionQuality = 'healthy';

      for (const viewer of perViewerStats) {
        const quality = scoreQuality(viewer.stats, expectedFps);
        viewerQualities.set(viewer.viewerId, quality);

        if (quality === 'bad') {
          worstRaw = 'bad';
        } else if (quality === 'degrading' && worstRaw !== 'bad') {
          worstRaw = 'degrading';
        }
      }

      setPerViewerQuality(viewerQualities);

      // Apply smoothing
      if (worstRaw === 'bad') {
        badCountRef.current++;
        degradingCountRef.current++;
      } else if (worstRaw === 'degrading') {
        badCountRef.current = 0;
        degradingCountRef.current++;
      } else {
        badCountRef.current = 0;
        degradingCountRef.current = 0;
      }

      // Determine smoothed quality
      let smoothedQuality: ConnectionQuality = 'healthy';
      if (badCountRef.current >= SMOOTHING.badChecks) {
        smoothedQuality = 'bad';
      } else if (degradingCountRef.current >= SMOOTHING.degradingChecks) {
        smoothedQuality = 'degrading';
      }

      setOverallQuality(smoothedQuality);

      // Trigger warning on transition to degrading or bad
      if (
        smoothedQuality !== 'healthy' &&
        smoothedQuality !== lastQualityRef.current &&
        !warningDismissedRef.current
      ) {
        setShouldWarn(true);
      }

      // Reset dismissed flag if quality returns to healthy
      if (smoothedQuality === 'healthy') {
        warningDismissedRef.current = false;
        setShouldWarn(false);
      }

      lastQualityRef.current = smoothedQuality;
    };

    checkQuality();
    const interval = setInterval(checkQuality, SMOOTHING.checkInterval);
    return () => clearInterval(interval);
  }, [isActive, perViewerStats, expectedFps]);

  const suggested = suggestPreset(overallQuality) as QualityPresetName | null;

  return {
    overallQuality,
    perViewerQuality,
    shouldWarn,
    suggestedPreset: suggested,
    dismissWarning,
  };
}

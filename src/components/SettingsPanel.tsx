import { useState, useCallback, useEffect, useRef } from 'react';

import type {
  PeeksySettings,
  QualityPresetName,
  ToolbarPosition,
  ToolbarExpandMode,
  PiPPosition,
} from '../lib/types';
import { QUALITY_PRESETS } from '../lib/constants';

import './SettingsPanel.css';

// ── Types ──

interface SettingsPanelProps {
  settings: PeeksySettings;
  onUpdateSetting: <K extends keyof PeeksySettings>(key: K, value: PeeksySettings[K]) => void;
  onUpdateNestedSetting: <K extends keyof PeeksySettings, NK extends keyof PeeksySettings[K]>(
    key: K,
    nestedKey: NK,
    value: PeeksySettings[K][NK]
  ) => void;
  onResetSettings: () => void;
  onClose: () => void;
  roomPassword: string | null;
  onPasswordChange: (password: string | null) => void;
}

// ── Toggle Switch ──

function ToggleSwitch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <div className="settingsToggleRow">
      <label htmlFor={id} className="settingsToggleLabel">{label}</label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        className={`settingsToggle ${checked ? 'settingsToggle--on' : ''}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className="settingsToggleThumb" />
      </button>
    </div>
  );
}

// ── Component ──

export default function SettingsPanel({
  settings,
  onUpdateSetting,
  onUpdateNestedSetting,
  onResetSettings,
  onClose,
  roomPassword,
  onPasswordChange,
}: SettingsPanelProps) {
  const [passwordInput, setPasswordInput] = useState(roomPassword || '');
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync password input when prop changes
  useEffect(() => {
    setPasswordInput(roomPassword || '');
  }, [roomPassword]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid catching the click that opened the panel
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handlePasswordBlur = useCallback(() => {
    const trimmed = passwordInput.trim();
    onPasswordChange(trimmed || null);
  }, [passwordInput, onPasswordChange]);

  const handlePasswordKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePasswordBlur();
    }
  }, [handlePasswordBlur]);

  const presetNames = Object.keys(QUALITY_PRESETS) as QualityPresetName[];

  return (
    <div className="settingsOverlay">
      <div ref={panelRef} className="settingsPanel">
        {/* ── Header ── */}
        <div className="settingsHeader">
          <h2 className="settingsTitle">Settings</h2>
          <button className="settingsCloseButton" onClick={onClose} type="button">
            {'\u2715'}
          </button>
        </div>

        <div className="settingsSections">
          {/* ── Streaming Quality ── */}
          <section className="settingsSection">
            <h3 className="settingsSectionTitle">Streaming Quality</h3>

            <div className="settingsPresetGrid">
              {presetNames.map((name) => {
                const preset = QUALITY_PRESETS[name];
                const isActive = settings.qualityPreset === name;
                return (
                  <button
                    key={name}
                    className={`settingsPresetButton ${isActive ? 'settingsPresetButton--active' : ''}`}
                    onClick={() => onUpdateSetting('qualityPreset', name)}
                    type="button"
                  >
                    <span className="settingsPresetName">{preset.label}</span>
                    <span className="settingsPresetDesc">
                      {name === 'custom'
                        ? 'Custom'
                        : `${preset.width}×${preset.height} ${preset.frameRate}fps`}
                    </span>
                  </button>
                );
              })}
            </div>

            {settings.qualityPreset === 'custom' && (
              <div className="settingsCustomQuality">
                <div className="settingsInputRow">
                  <label className="settingsInputLabel">Width</label>
                  <input
                    className="settingsInput"
                    type="number"
                    value={settings.customQuality.width}
                    onChange={(e) => onUpdateNestedSetting('customQuality', 'width', parseInt(e.target.value) || 0)}
                    min={320}
                    max={3840}
                  />
                </div>
                <div className="settingsInputRow">
                  <label className="settingsInputLabel">Height</label>
                  <input
                    className="settingsInput"
                    type="number"
                    value={settings.customQuality.height}
                    onChange={(e) => onUpdateNestedSetting('customQuality', 'height', parseInt(e.target.value) || 0)}
                    min={240}
                    max={2160}
                  />
                </div>
                <div className="settingsInputRow">
                  <label className="settingsInputLabel">FPS</label>
                  <input
                    className="settingsInput"
                    type="number"
                    value={settings.customQuality.frameRate}
                    onChange={(e) => onUpdateNestedSetting('customQuality', 'frameRate', parseInt(e.target.value) || 0)}
                    min={1}
                    max={120}
                  />
                </div>
                <div className="settingsInputRow">
                  <label className="settingsInputLabel">Bitrate (bps)</label>
                  <input
                    className="settingsInput"
                    type="number"
                    value={settings.customQuality.bitrate}
                    onChange={(e) => onUpdateNestedSetting('customQuality', 'bitrate', parseInt(e.target.value) || 0)}
                    min={100000}
                    max={50000000}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ── Display Options ── */}
          <section className="settingsSection">
            <h3 className="settingsSectionTitle">Display</h3>

            <div className="settingsInputRow">
              <label className="settingsInputLabel">Toolbar Position</label>
              <select
                className="settingsSelect"
                value={settings.toolbarPosition}
                onChange={(e) => onUpdateSetting('toolbarPosition', e.target.value as ToolbarPosition)}
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>

            <div className="settingsInputRow">
              <label className="settingsInputLabel">Expand Mode</label>
              <select
                className="settingsSelect"
                value={settings.toolbarExpandMode}
                onChange={(e) => onUpdateSetting('toolbarExpandMode', e.target.value as ToolbarExpandMode)}
              >
                <option value="click">Click</option>
                <option value="hover">Hover</option>
              </select>
            </div>

            <div className="settingsInputRow">
              <label className="settingsInputLabel">Camera Position</label>
              <select
                className="settingsSelect"
                value={settings.pipPosition}
                onChange={(e) => onUpdateSetting('pipPosition', e.target.value as PiPPosition)}
              >
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
          </section>

          {/* ── Notifications ── */}
          <section className="settingsSection">
            <h3 className="settingsSectionTitle">Notifications</h3>
            <ToggleSwitch
              id="toggle-notifications"
              label="Show join/leave notifications"
              checked={settings.showNotifications}
              onChange={(v) => onUpdateSetting('showNotifications', v)}
            />
          </section>

          {/* ── Performance Monitor ── */}
          <section className="settingsSection">
            <h3 className="settingsSectionTitle">Performance</h3>
            <ToggleSwitch
              id="toggle-perf-monitor"
              label="Show performance overlay"
              checked={settings.showPerformanceMonitor}
              onChange={(v) => onUpdateSetting('showPerformanceMonitor', v)}
            />

            {settings.showPerformanceMonitor && (
              <div className="settingsPerfToggles">
                <ToggleSwitch id="perf-fps" label="FPS" checked={settings.performanceStats.fps} onChange={(v) => onUpdateNestedSetting('performanceStats', 'fps', v)} />
                <ToggleSwitch id="perf-latency" label="Latency" checked={settings.performanceStats.latency} onChange={(v) => onUpdateNestedSetting('performanceStats', 'latency', v)} />
                <ToggleSwitch id="perf-cpu" label="CPU" checked={settings.performanceStats.cpu} onChange={(v) => onUpdateNestedSetting('performanceStats', 'cpu', v)} />
                <ToggleSwitch id="perf-bitrate" label="Bitrate" checked={settings.performanceStats.bitrate} onChange={(v) => onUpdateNestedSetting('performanceStats', 'bitrate', v)} />
                <ToggleSwitch id="perf-resolution" label="Resolution" checked={settings.performanceStats.resolution} onChange={(v) => onUpdateNestedSetting('performanceStats', 'resolution', v)} />
                <ToggleSwitch id="perf-packetloss" label="Packet Loss" checked={settings.performanceStats.packetLoss} onChange={(v) => onUpdateNestedSetting('performanceStats', 'packetLoss', v)} />
                <ToggleSwitch id="perf-encode" label="Encode Time" checked={settings.performanceStats.encodeTime} onChange={(v) => onUpdateNestedSetting('performanceStats', 'encodeTime', v)} />
              </div>
            )}
          </section>

          {/* ── Room Password ── */}
          <section className="settingsSection">
            <h3 className="settingsSectionTitle">Room Password</h3>
            <p className="settingsHint">Leave empty for no password. Viewers will need this to join.</p>
            <input
              className="settingsInput settingsInput--full"
              type="text"
              placeholder="No password set"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onBlur={handlePasswordBlur}
              onKeyDown={handlePasswordKeyDown}
            />
          </section>

          {/* ── Connection Colors ── */}
          <section className="settingsSection">
            <h3 className="settingsSectionTitle">Connection Colors</h3>
            <div className="settingsColorRow">
              <label className="settingsInputLabel">Healthy</label>
              <input
                className="settingsColorInput"
                type="color"
                value={settings.connectionColors.healthy}
                onChange={(e) => onUpdateNestedSetting('connectionColors', 'healthy', e.target.value)}
              />
            </div>
            <div className="settingsColorRow">
              <label className="settingsInputLabel">Degrading</label>
              <input
                className="settingsColorInput"
                type="color"
                value={settings.connectionColors.degrading}
                onChange={(e) => onUpdateNestedSetting('connectionColors', 'degrading', e.target.value)}
              />
            </div>
            <div className="settingsColorRow">
              <label className="settingsInputLabel">Bad</label>
              <input
                className="settingsColorInput"
                type="color"
                value={settings.connectionColors.bad}
                onChange={(e) => onUpdateNestedSetting('connectionColors', 'bad', e.target.value)}
              />
            </div>
          </section>

          {/* ── About ── */}
          <section className="settingsSection">
            <h3 className="settingsSectionTitle">About</h3>
            <div className="settingsAbout">
              <img className="settingsAboutLogo" src="/peeksy-logo.png" alt="Peeksy" draggable={false} />
              <p className="settingsAboutText">
                Peeksy — Tiny open-source P2P screen sharing.
                <br />
                No accounts. No installs. Just share.
              </p>
            </div>
          </section>

          {/* ── Reset ── */}
          <button className="settingsResetButton" onClick={onResetSettings} type="button">
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

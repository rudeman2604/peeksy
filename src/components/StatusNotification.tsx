import { useState, useCallback, useEffect, useRef } from 'react';

import type { ToolbarPosition } from '../lib/types';

import './StatusNotification.css';

// ── Types ──

export interface StatusNotificationItem {
  id: string;
  type: 'join' | 'leave';
  text: string;
  imageSrc: string;
  createdAt: number;
}

interface StatusNotificationProps {
  notifications: StatusNotificationItem[];
  onExpire: (id: string) => void;
  toolbarPosition: ToolbarPosition;
}

// ── Config ──

const VISIBLE_DURATION = 2000;  // 2s visible
const FADE_DURATION = 500;      // 0.5s fade
const MAX_VISIBLE = 5;

// ── Single Notification ──

function NotificationCard({
  item,
  onExpire,
}: {
  item: StatusNotificationItem;
  onExpire: (id: string) => void;
}) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, VISIBLE_DURATION);

    const removeTimer = setTimeout(() => {
      onExpire(item.id);
    }, VISIBLE_DURATION + FADE_DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id, onExpire]);

  return (
    <div className={`statusNotification ${fading ? 'statusNotification--fading' : ''}`}>
      <img
        className="statusNotificationPixie"
        src={item.imageSrc}
        alt={item.type === 'join' ? 'Viewer joined' : 'Viewer left'}
        draggable={false}
      />
      <span className="statusNotificationText">{item.text}</span>
    </div>
  );
}

// ── Container ──

export default function StatusNotificationContainer({
  notifications,
  onExpire,
  toolbarPosition,
}: StatusNotificationProps) {
  // Show only the most recent MAX_VISIBLE
  const visible = notifications.slice(-MAX_VISIBLE);

  // Position opposite the toolbar
  const position = toolbarPosition === 'top' ? 'bottom' : 'top';

  return (
    <div
      className={`statusNotificationContainer statusNotificationContainer--${position}`}
    >
      {visible.map((item) => (
        <NotificationCard key={item.id} item={item} onExpire={onExpire} />
      ))}
    </div>
  );
}

// ── Helper: create notification with random leave image ──

let notifCounter = 0;

export function createJoinNotification(): StatusNotificationItem {
  return {
    id: `notif-${++notifCounter}-${Date.now()}`,
    type: 'join',
    text: 'Someone started peeking!',
    imageSrc: '/pixie/waving.png',
    createdAt: Date.now(),
  };
}

export function createLeaveNotification(): StatusNotificationItem {
  // 50/50 between crying and leaving-the-live
  const useCrying = Math.random() < 0.5;
  return {
    id: `notif-${++notifCounter}-${Date.now()}`,
    type: 'leave',
    text: 'A viewer left',
    imageSrc: useCrying ? '/pixie/crying.png' : '/pixie/leaving-the-live.png',
    createdAt: Date.now(),
  };
}

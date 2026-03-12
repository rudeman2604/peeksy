import { useState, useEffect, useCallback } from 'react';

import './Toast.css';

// ── Types ──

interface ToastProps {
  text: string | null;
  onDone: () => void;
}

// ── Component ──

export default function Toast({ text, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (text) {
      setDisplayText(text);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 300); // Wait for fade-out animation
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [text, onDone]);

  if (!displayText) return null;

  return (
    <div className={`toast ${visible ? 'toast--visible' : 'toast--hidden'}`}>
      {displayText}
    </div>
  );
}

import { useState, useCallback, useRef } from 'react';

import './PasswordEntry.css';

// ── Types ──

interface PasswordEntryProps {
  onSubmit: (password: string) => void;
  isLoading?: boolean;
  error?: boolean;
}

// ── Component ──

export default function PasswordEntry({ onSubmit, isLoading, error }: PasswordEntryProps) {
  const [password, setPassword] = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger shake when error prop changes to true
  const prevErrorRef = useRef(false);
  if (error && !prevErrorRef.current) {
    // Start shake
    setTimeout(() => {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }, 0);
  }
  prevErrorRef.current = !!error;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;
    onSubmit(password);
  }, [password, isLoading, onSubmit]);

  return (
    <div className="passwordEntry">
      <div className={`passwordCard ${shaking ? 'passwordCard--shake' : ''}`}>
        <img
          className="passwordPixie"
          src="/pixie/sleeping.png"
          alt="Sleeping pixie"
          draggable={false}
        />

        <h2 className="passwordTitle">This room is locked</h2>
        <p className="passwordSubtitle">Enter the password to start watching</p>

        <form className="passwordForm" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className={`passwordInput ${error ? 'passwordInput--error' : ''}`}
            type="password"
            placeholder="Room password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={isLoading}
          />
          <button
            className="passwordSubmit"
            type="submit"
            disabled={!password.trim() || isLoading}
          >
            {isLoading ? 'Checking...' : 'Enter'}
          </button>
        </form>

        {error && (
          <p className="passwordError">Wrong password, try again</p>
        )}
      </div>
    </div>
  );
}

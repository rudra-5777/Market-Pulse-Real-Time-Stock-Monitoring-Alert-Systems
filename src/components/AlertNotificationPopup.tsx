import React, { useEffect, useRef } from 'react';
import { AlertNotification } from '../types';

interface AlertNotificationPopupProps {
  notifications: AlertNotification[];
  onDismiss: (notifId: string) => void;
  onSnooze: (notifId: string) => void;
}

/** Duration (ms) for the enter animation via CSS class */
const ANIMATION_DURATION_MS = 350;

export default function AlertNotificationPopup({
  notifications,
  onDismiss,
  onSnooze,
}: AlertNotificationPopupProps) {
  if (notifications.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Stock price alerts"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {notifications.map(n => (
        <NotificationCard
          key={n.notifId}
          notification={n}
          onDismiss={onDismiss}
          onSnooze={onSnooze}
        />
      ))}
    </div>
  );
}

// ── Individual notification card ─────────────────────────────────────────────

interface CardProps {
  notification: AlertNotification;
  onDismiss: (notifId: string) => void;
  onSnooze: (notifId: string) => void;
}

function NotificationCard({ notification: n, onDismiss, onSnooze }: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Slide-in animation on mount
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(110%)';
    const raf = requestAnimationFrame(() => {
      el.style.transition = `opacity ${ANIMATION_DURATION_MS}ms ease, transform ${ANIMATION_DURATION_MS}ms ease`;
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const isAbove = n.alert_type === 'above';
  const directionIcon = isAbove ? '🔺' : '🔻';
  const directionLabel = isAbove ? 'above' : 'below';
  const accentClass = isAbove
    ? 'border-emerald-400 dark:border-emerald-500'
    : 'border-red-400 dark:border-red-500';
  const badgeClass = isAbove
    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';

  return (
    <div
      ref={cardRef}
      role="alert"
      aria-live="assertive"
      className={[
        'pointer-events-auto',
        'relative rounded-xl shadow-2xl',
        'bg-white dark:bg-slate-800',
        'border-l-4',
        accentClass,
        'px-4 py-3',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl" aria-hidden="true">{directionIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            {n.symbol}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Price alert triggered
          </p>
        </div>
        {/* Close button */}
        <button
          aria-label={`Dismiss alert for ${n.symbol}`}
          onClick={() => onDismiss(n.notifId)}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Price info */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
          ${n.triggered_price.toFixed(2)}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {directionIcon} {directionLabel} ${n.target_price.toFixed(2)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onSnooze(n.notifId)}
          className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          😴 Snooze 5 min
        </button>
        <button
          onClick={() => onDismiss(n.notifId)}
          className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
        >
          🗑 Dismiss
        </button>
      </div>
    </div>
  );
}

/**
 * useAlertMonitor
 * ─────────────────────────────────────────────────────────────────────────────
 * Watches live stock prices against the user's saved alert thresholds.
 *
 * Behaviour
 * ──────────
 * • On every price update, untriggered + non-snoozed alerts are checked.
 * • When a crossing is detected an `AlertNotification` is pushed onto the
 *   notifications list and a short beep is played via the Web Audio API.
 * • `dismissNotification(notifId)` removes the popup.
 * • `snoozeNotification(notifId)` removes the popup and suppresses that alert
 *   for `SNOOZE_DURATION_MS` milliseconds (default: 5 minutes) before it can
 *   fire again.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Stock, Alert, AlertNotification } from '../types';

/** How long (ms) a snoozed alert is suppressed before it can re-fire (5 minutes). */
const SNOOZE_DURATION_MS = 5 * 60 * 1_000;

/** Generate a short two-tone beep using the Web Audio API. */
function playAlertSound() {
  try {
    const ctx = new AudioContext();

    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.15);       // A5
    playTone(1100, now + 0.18, 0.15); // C#6

    // Close the context shortly after the sound finishes to free resources
    setTimeout(() => ctx.close(), 600);
  } catch {
    // AudioContext may be unavailable (e.g. in some test environments) – silently ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface UseAlertMonitorReturn {
  notifications: AlertNotification[];
  dismissNotification: (notifId: string) => void;
  snoozeNotification: (notifId: string) => void;
}

export function useAlertMonitor(
  stocks: Stock[],
  alerts: Alert[],
): UseAlertMonitorReturn {
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);

  /**
   * Set of alertIds that have already fired during this session.
   * Prevents the same alert from generating multiple popups as prices keep updating.
   */
  const firedRef = useRef<Set<string>>(new Set());

  /**
   * Set of alertIds that are currently snoozed.
   * While in this set the alert will not re-fire.
   */
  const snoozedRef = useRef<Set<string>>(new Set());

  /** Snooze timers keyed by alertId so we can clear them if needed. */
  const snoozeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Check prices whenever stocks or alerts change
  useEffect(() => {
    if (alerts.length === 0 || stocks.length === 0) return;

    const priceBySymbol = new Map(stocks.map(s => [s.symbol, s.current_price]));

    alerts.forEach(alert => {
      // Skip already-triggered, snoozed, or previously-fired alerts
      if (alert.is_triggered) return;
      if (firedRef.current.has(alert.id)) return;
      if (snoozedRef.current.has(alert.id)) return;

      const currentPrice = priceBySymbol.get(alert.symbol);
      if (currentPrice === undefined) return;

      const crossed =
        (alert.alert_type === 'above' && currentPrice >= alert.target_price) ||
        (alert.alert_type === 'below' && currentPrice <= alert.target_price);

      if (!crossed) return;

      // Mark as fired so it won't re-trigger continuously
      firedRef.current.add(alert.id);

      const notification: AlertNotification = {
        notifId: `${alert.id}-${Date.now()}`,
        alertId: alert.id,
        symbol: alert.symbol,
        triggered_price: currentPrice,
        target_price: alert.target_price,
        alert_type: alert.alert_type,
        timestamp: Date.now(),
      };

      setNotifications(prev => [...prev, notification]);
      playAlertSound();
    });
  }, [stocks, alerts]);

  // Cleanup snooze timers on unmount
  useEffect(() => {
    const timers = snoozeTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const dismissNotification = useCallback((notifId: string) => {
    setNotifications(prev => prev.filter(n => n.notifId !== notifId));
  }, []);

  const snoozeNotification = useCallback((notifId: string) => {
    setNotifications(prev => {
      const target = prev.find(n => n.notifId === notifId);
      if (target) {
        const { alertId } = target;

        // Suppress the alert for SNOOZE_DURATION_MS
        snoozedRef.current.add(alertId);

        // After snooze expires: remove from snoozed + fired sets so it can re-fire
        if (snoozeTimers.current[alertId]) {
          clearTimeout(snoozeTimers.current[alertId]);
        }
        snoozeTimers.current[alertId] = setTimeout(() => {
          snoozedRef.current.delete(alertId);
          firedRef.current.delete(alertId);
          delete snoozeTimers.current[alertId];
        }, SNOOZE_DURATION_MS);
      }
      return prev.filter(n => n.notifId !== notifId);
    });
  }, []);

  return { notifications, dismissNotification, snoozeNotification };
}

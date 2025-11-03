import { useEffect, useRef } from 'react';

const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

export const useAutoRefresh = (
  callback: () => void,
  interval: number = DEFAULT_REFRESH_INTERVAL,
  enabled: boolean = true
) => {
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Start the interval
    timerRef.current = window.setInterval(callback, interval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timerRef.current !== undefined) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [callback, interval, enabled]);

  return timerRef.current;
};
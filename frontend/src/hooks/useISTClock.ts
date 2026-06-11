// frontend/src/hooks/useISTClock.ts
import { useState, useEffect } from 'react';

export function useISTClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(
      new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short', day: '2-digit', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
        second: '2-digit', hour12: false
      })
    );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time; // e.g. "Fri, 05 Jun 2026  19:42:31 IST" (we'll format it with IST suffix when displaying)
}

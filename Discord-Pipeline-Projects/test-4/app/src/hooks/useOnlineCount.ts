'use client';

import { useState, useEffect } from 'react';

const SIMULATED_BASE = 1200;
const SIMULATED_VARIANCE = 100;

/**
 * Returns the number of players currently online.
 * In production, this would connect to a WebSocket server.
 * For now, simulates a fluctuating count.
 */
export default function useOnlineCount(): number {
  const [count, setCount] = useState(SIMULATED_BASE + Math.floor(Math.random() * SIMULATED_VARIANCE));

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.floor(Math.random() * 21) - 10; // -10 to +10
        return Math.max(1, prev + delta);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return count;
}

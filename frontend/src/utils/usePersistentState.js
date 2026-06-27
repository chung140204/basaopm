import { useEffect, useRef, useState } from 'react';

// useState that mirrors its value into localStorage, so navigation state
// survives a page refresh (F5). Falls back gracefully if storage is blocked.
export default function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Avoid writing on the very first render with the initial value.
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
    }
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Ignore storage errors (private mode, quota, etc.).
    }
  }, [key, value]);

  return [value, setValue];
}

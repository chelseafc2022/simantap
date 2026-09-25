'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook untuk debounce nilai (seperti search input)
 * @param value Nilai yang ingin di-debounce
 * @param delay Waktu tunda dalam milidetik (default: 400ms)
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

'use client';

import {
  QueryClientProvider,
  dehydrate,
  hydrate,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { ReactNode, useEffect } from 'react';
import { getQueryClient } from '../lib/query-client';

export const RQ_CACHE_STORAGE_KEY = 'MONALISA_RQ_CACHE_V1';
const CACHE_MAX_AGE_MS = 15 * 60 * 1000; // 15 menit

let hasHydratedFromStorage = false;

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  useEffect(() => {
    // Hydrate setelah mount agar SSR dan render awal client identik (tanpa hydration mismatch)
    if (!hasHydratedFromStorage) {
      hasHydratedFromStorage = true;
      try {
        const raw = window.localStorage.getItem(RQ_CACHE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            timestamp?: number;
            clientState?: unknown;
          };
          if (
            parsed?.clientState &&
            typeof parsed.timestamp === 'number' &&
            Date.now() - parsed.timestamp < CACHE_MAX_AGE_MS
          ) {
            hydrate(queryClient, parsed.clientState);
          } else {
            window.localStorage.removeItem(RQ_CACHE_STORAGE_KEY);
          }
        }
      } catch {
        // Abaikan jika localStorage korup/tidak tersedia
      }
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const state = dehydrate(queryClient, {
            shouldDehydrateQuery: (q) => q.state.status === 'success',
          });
          window.localStorage.setItem(
            RQ_CACHE_STORAGE_KEY,
            JSON.stringify({ timestamp: Date.now(), clientState: state }),
          );
        } catch {
          // Abaikan jika melebihi kuota localStorage
        }
      }, 600);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

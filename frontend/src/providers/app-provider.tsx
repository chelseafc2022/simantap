'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '../contexts/auth-context';
import { QueryProvider } from './query-provider';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}

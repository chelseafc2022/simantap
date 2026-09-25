'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarConfigProvider } from '@/contexts/sidebar-context';
import { AuthProvider } from '../contexts/auth-context';
import { QueryProvider } from './query-provider';
import { Toaster } from 'sonner';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="system" storageKey="simantap-ui-theme">
        <SidebarConfigProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" closeButton />
          </AuthProvider>
        </SidebarConfigProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

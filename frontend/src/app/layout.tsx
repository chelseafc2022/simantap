import type { Metadata } from 'next';
import { inter } from '@/lib/fonts';
import { siteConfig } from '../config/site';
import { AppProvider } from '../providers/app-provider';
import './globals.css';

export const metadata: Metadata = {
  title: `${siteConfig.name} - ${siteConfig.fullName}`,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} antialiased`}>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

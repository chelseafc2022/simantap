import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { siteConfig } from '../config/site';
import { AppProvider } from '../providers/app-provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-neutral-950 text-neutral-100`}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

import React from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { GeistSans } from 'geist/font/sans';
import Topbar from '@/components/Topbar';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import '../styles/tailwind.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'DL DevToolkit — Browser-Based Developer Tools',
  description: 'A zero-install browser toolkit for developers: format, diff, convert, generate, and inspect code, data, and files entirely client-side.',
  icons: {
    icon: [
      { url: '/assets/images/app_logo.jpg', type: 'image/jpeg' },
      { url: '/assets/images/app_logo.jpg', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="km"
      className={GeistSans.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${GeistSans.className} relative`} suppressHydrationWarning>
        <GoogleAnalytics />
        <Topbar />
        <main className="relative min-h-screen bg-background text-foreground">
          {children}
        </main>

        <Script
          src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fdevtoolkit2501back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20"
          strategy="afterInteractive"
          type="module"
        />
        <Script
          src="https://static.rocket.new/rocket-shot.js?v=0.0.2"
          strategy="afterInteractive"
          type="module"
        />
      </body>
    </html>
  );
}

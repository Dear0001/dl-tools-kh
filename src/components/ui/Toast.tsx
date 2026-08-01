'use client';
import dynamic from 'next/dynamic';

const Toaster = dynamic(
  () => import('sonner')?.then((mod) => mod?.Toaster),
  { ssr: false }
);

export default function Toast() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
        },
      }}
    />
  );
}
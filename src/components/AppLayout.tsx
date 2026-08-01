import React from 'react';
import Topbar from './Topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Topbar />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
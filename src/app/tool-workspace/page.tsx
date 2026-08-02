import React, { Suspense } from 'react';
import WorkspaceLoader from './components/WorkspaceLoader';
import Toast from '@/components/ui/Toast';

export default function ToolWorkspacePage() {
  return (
    <>
      <Toast />
      <Suspense fallback={
        <div className="w-full h-[calc(100vh-56px)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading tool…</span>
          </div>
        </div>
      }>
        <WorkspaceLoader />
      </Suspense>
    </>
  );
}
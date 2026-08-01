'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { TOOLS } from '@/data/tools';
import WorkspaceShell from './WorkspaceShell';
import NoToolSelected from './NoToolSelected';

export default function WorkspaceLoader() {
  const searchParams = useSearchParams();
  const toolId = searchParams?.get('tool');
  const tool = toolId ? TOOLS?.find((t) => t?.id === toolId) : null;

  if (!tool) return <NoToolSelected />;
  return <WorkspaceShell tool={tool} />;
}
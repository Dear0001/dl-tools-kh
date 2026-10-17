import { auth } from '../../../../../auth';
import { TOOLS } from '@/data/tools';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const recentTools = await prisma.recentTool.findMany({
    where: { userId: session.user.id },
    orderBy: { lastOpenedAt: 'desc' },
    take: 8,
    select: { toolId: true },
  });

  return Response.json({ toolIds: recentTools.map(({ toolId }) => toolId) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const values =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const toolIds = Array.isArray(values.toolIds)
    ? values.toolIds
    : typeof values.toolId === 'string'
      ? [values.toolId]
      : [];

  if (toolIds.length === 0 || toolIds.length > 8 || toolIds.some((id) => typeof id !== 'string' || !TOOLS.some((tool) => tool.id === id))) {
    return Response.json({ error: 'Provide between one and eight valid tool IDs.' }, { status: 400 });
  }

  const uniqueIds = [...new Set(toolIds as string[])];
  await prisma.$transaction(
    uniqueIds.map((toolId, index) =>
      prisma.recentTool.upsert({
        where: { userId_toolId: { userId: session.user.id, toolId } },
        create: {
          userId: session.user.id,
          toolId,
          lastOpenedAt: new Date(Date.now() - index),
        },
        update: { lastOpenedAt: new Date(Date.now() - index) },
      }),
    ),
  );

  return GET();
}

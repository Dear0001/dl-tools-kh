import { auth } from '../../../../../auth';
import { TOOLS } from '@/data/tools';
import { prisma } from '@/lib/prisma';

const MAX_CONTENT_LENGTH = 1_000_000;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const toolId = new URL(request.url).searchParams.get('toolId');
  if (toolId && !TOOLS.some((tool) => tool.id === toolId)) {
    return Response.json({ error: 'Unknown tool.' }, { status: 400 });
  }

  const items = await prisma.savedToolData.findMany({
    where: { userId: session.user.id, ...(toolId ? { toolId } : {}) },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      toolId: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json({
    items: items.map(({ content, ...item }) => ({
      ...item,
      contentPreview: content.slice(0, 500),
    })),
  });
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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Saved data must be a JSON object.' }, { status: 400 });
  }

  const { toolId, title, content } = body as Record<string, unknown>;
  if (typeof toolId !== 'string' || !TOOLS.some((tool) => tool.id === toolId)) {
    return Response.json({ error: 'Choose a valid tool.' }, { status: 400 });
  }
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 100) {
    return Response.json({ error: 'Title is required and must be at most 100 characters.' }, { status: 400 });
  }
  if (typeof content !== 'string' || !content.trim()) {
    return Response.json({ error: 'Content is required.' }, { status: 400 });
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_LENGTH) {
    return Response.json({ error: 'Saved content must be no larger than 1 MB.' }, { status: 413 });
  }

  const item = await prisma.savedToolData.create({
    data: { userId: session.user.id, toolId, title: title.trim(), content },
    select: { id: true, toolId: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  return Response.json({ item }, { status: 201 });
}

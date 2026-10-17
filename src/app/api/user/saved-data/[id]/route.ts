import { auth } from '../../../../../../auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.savedToolData.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, title: true, content: true },
  });

  if (!item) {
    return Response.json({ error: 'Saved data was not found.' }, { status: 404 });
  }

  return Response.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.savedToolData.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return Response.json({ error: 'Saved data was not found.' }, { status: 404 });
  }

  return Response.json({ success: true });
}

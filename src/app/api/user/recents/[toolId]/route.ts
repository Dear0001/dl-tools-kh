import { auth } from '../../../../../../auth';
import { TOOLS } from '@/data/tools';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ toolId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const { toolId } = await params;
  if (!TOOLS.some((tool) => tool.id === toolId)) {
    return Response.json({ error: 'Unknown tool.' }, { status: 404 });
  }

  await prisma.recentTool.deleteMany({
    where: { userId: session.user.id, toolId },
  });

  return Response.json({ success: true });
}

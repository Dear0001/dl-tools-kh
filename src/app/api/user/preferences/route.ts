import { auth } from '../../../../../auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_PREFERENCES = { theme: 'light', locale: 'kh' };
const THEMES = ['light', 'dark', 'nord', 'monokai'];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const preferences = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { theme: true, locale: true },
  });

  return Response.json(preferences ?? DEFAULT_PREFERENCES);
}

export async function PATCH(request: Request) {
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
    return Response.json({ error: 'Preferences must be a JSON object.' }, { status: 400 });
  }

  const { theme, locale } = body as Record<string, unknown>;
  if (theme !== undefined && (typeof theme !== 'string' || !THEMES.includes(theme))) {
    return Response.json({ error: 'Choose one of the available themes.' }, { status: 400 });
  }
  if (locale !== undefined && locale !== 'en' && locale !== 'kh') {
    return Response.json({ error: 'Locale must be "en" or "kh".' }, { status: 400 });
  }
  if (theme === undefined && locale === undefined) {
    return Response.json({ error: 'Provide a theme or locale to update.' }, { status: 400 });
  }

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      theme: typeof theme === 'string' ? theme : DEFAULT_PREFERENCES.theme,
      locale: typeof locale === 'string' ? locale : DEFAULT_PREFERENCES.locale,
    },
    update: {
      ...(typeof theme === 'string' ? { theme } : {}),
      ...(typeof locale === 'string' ? { locale } : {}),
    },
    select: { theme: true, locale: true },
  });

  return Response.json(preferences);
}

import { createHash, createHmac, randomBytes } from 'node:crypto';
import { DocumentConversionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const JOB_TTL_MS = 24 * 60 * 60 * 1000;
const CLOUDCONVERT_API_URL = 'https://api.cloudconvert.com/v2';

type ConversionMode = 'pdf-to-docx' | 'docx-to-pdf';
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeFilename(value: string): string {
  const name = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, '_').trim() ?? '';
  return name.slice(0, 180) || 'document';
}

function getMode(value: unknown): ConversionMode | null {
  return value === 'pdf-to-docx' || value === 'docx-to-pdf' ? value : null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getClientIp(request: Request): string {
  return request.headers.get('x-real-ip')?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

async function consumeRateLimit(request: Request): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET must be configured to secure conversion rate limits.');

  const ipHash = createHmac('sha256', secret).update(getClientIp(request)).digest('hex');
  const [counter] = await prisma.$queryRaw<Array<{ attempts: number; windowStartedAt: Date }>>`
    INSERT INTO "DocumentConversionRateLimit" ("ipHash", "windowStartedAt", "attempts")
    VALUES (${ipHash}, CURRENT_TIMESTAMP, 1)
    ON CONFLICT ("ipHash") DO UPDATE SET
      "attempts" = CASE
        WHEN "DocumentConversionRateLimit"."windowStartedAt" <= CURRENT_TIMESTAMP - INTERVAL '10 minutes' THEN 1
        ELSE "DocumentConversionRateLimit"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "DocumentConversionRateLimit"."windowStartedAt" <= CURRENT_TIMESTAMP - INTERVAL '10 minutes' THEN CURRENT_TIMESTAMP
        ELSE "DocumentConversionRateLimit"."windowStartedAt"
      END
    RETURNING "attempts", "windowStartedAt"
  `;

  if (counter.attempts <= RATE_LIMIT) return { allowed: true };

  const retryAfter = Math.max(
    1,
    Math.ceil((counter.windowStartedAt.getTime() + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000),
  );
  return { allowed: false, retryAfter };
}

async function cloudConvertRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) throw new Error('CLOUDCONVERT_API_KEY is not configured.');

  return fetch(`${CLOUDCONVERT_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
}

function parseProviderJob(value: unknown): JsonObject | null {
  if (!isObject(value) || !isObject(value.data) || !Array.isArray(value.data.tasks)) return null;
  return value.data;
}

function getImportForm(job: JsonObject): { url: string; parameters: Record<string, string> } | null {
  const tasks = job.tasks;
  if (!Array.isArray(tasks)) return null;
  const task = tasks.find((item) => isObject(item) && item.name === 'import-file');
  if (!isObject(task) || !isObject(task.result) || !isObject(task.result.form)) return null;

  const { url, parameters } = task.result.form;
  if (typeof url !== 'string' || !isObject(parameters)) return null;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }
  if (parsedUrl.protocol !== 'https:') return null;

  const entries = Object.entries(parameters);
  if (entries.some(([, parameter]) => typeof parameter !== 'string')) return null;
  const safeParameters: Record<string, string> = {};
  for (const [key, parameter] of entries) {
    if (typeof parameter !== 'string') return null;
    safeParameters[key] = parameter;
  }
  return { url: parsedUrl.toString(), parameters: safeParameters };
}

function getExportFile(job: JsonObject, taskName: string): { url: string; filename: string } | null {
  const tasks = job.tasks;
  if (!Array.isArray(tasks)) return null;
  const task = tasks.find((item) => isObject(item) && item.name === taskName);
  if (!isObject(task) || task.status !== 'finished' || !isObject(task.result) || !Array.isArray(task.result.files)) {
    return null;
  }

  const file = task.result.files.find(isObject);
  if (!file || typeof file.url !== 'string' || typeof file.filename !== 'string') return null;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(file.url);
  } catch {
    return null;
  }
  if (parsedUrl.protocol !== 'https:') return null;
  return { url: parsedUrl.toString(), filename: safeFilename(file.filename) };
}

async function deleteProviderJob(providerJobId: string): Promise<void> {
  const response = await cloudConvertRequest(`/jobs/${encodeURIComponent(providerJobId)}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new Error(`CloudConvert job cleanup failed with status ${response.status}.`);
  }
}

function getAccessToken(request: Request): string | null {
  const value = request.headers.get('authorization');
  const match = value?.match(/^Bearer ([a-f0-9]{64})$/i);
  return match?.[1] ?? null;
}

function toDatabaseStatus(status: unknown): DocumentConversionStatus | null {
  switch (status) {
    case 'waiting':
      return DocumentConversionStatus.WAITING;
    case 'processing':
      return DocumentConversionStatus.PROCESSING;
    case 'finished':
      return DocumentConversionStatus.FINISHED;
    case 'error':
      return DocumentConversionStatus.ERROR;
    default:
      return null;
  }
}

export async function POST(request: Request) {
  if (!process.env.CLOUDCONVERT_API_KEY || !process.env.AUTH_SECRET) {
    return Response.json({ error: 'Document conversion is not configured.' }, { status: 503 });
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Cross-origin conversion requests are not allowed.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  if (!isObject(body)) return Response.json({ error: 'Invalid conversion request.' }, { status: 400 });
  const mode = getMode(body.mode);
  if (!mode || typeof body.filename !== 'string' || typeof body.size !== 'number' || !Number.isSafeInteger(body.size)) {
    return Response.json({ error: 'Choose a supported conversion and provide a filename and file size.' }, { status: 400 });
  }

  const filename = safeFilename(body.filename);
  const expectedExtension = mode === 'pdf-to-docx' ? '.pdf' : '.docx';
  const size = body.size;
  if (!filename.toLowerCase().endsWith(expectedExtension) || size <= 0) {
    return Response.json({ error: 'The file type or size is invalid for this conversion.' }, { status: 400 });
  }
  if (size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: 'The file exceeds the 25 MB upload limit.' }, { status: 413 });
  }

  const rateLimit = await consumeRateLimit(request);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Too many conversions. Please wait before trying again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    );
  }

  const now = new Date();
  await prisma.documentConversionJob.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.documentConversionRateLimit.deleteMany({
    where: { windowStartedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });

  const outputExtension = mode === 'pdf-to-docx' ? '.docx' : '.pdf';
  const nameWithoutExtension = filename.slice(0, -expectedExtension.length) || 'converted';
  const outputFilename = `${nameWithoutExtension}${outputExtension}`;
  let createResponse: Response;
  try {
    createResponse = await cloudConvertRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify({
        tasks: {
          'import-file': { operation: 'import/upload' },
          'convert-file': {
            operation: 'convert',
            input: 'import-file',
            output_format: outputExtension.slice(1),
            filename: outputFilename,
          },
          'preview-file': { operation: 'export/url', input: 'convert-file', inline: true },
          'download-file': { operation: 'export/url', input: 'convert-file' },
        },
      }),
    });
  } catch (error) {
    console.error('Could not create a CloudConvert job.', error);
    return Response.json({ error: 'The conversion provider is temporarily unavailable.' }, { status: 502 });
  }

  if (!createResponse.ok) {
    console.error(`CloudConvert job creation failed with status ${createResponse.status}.`);
    return Response.json({ error: 'The conversion provider could not accept this file.' }, { status: 502 });
  }

  let providerPayload: unknown;
  try {
    providerPayload = await createResponse.json();
  } catch {
    console.error('CloudConvert returned invalid JSON while creating a job.');
    return Response.json({ error: 'The conversion provider returned an invalid response.' }, { status: 502 });
  }

  const providerJob = parseProviderJob(providerPayload);
  const providerJobId = providerJob?.id;
  const upload = providerJob && getImportForm(providerJob);
  if (typeof providerJobId !== 'string' || !upload) {
    console.error('CloudConvert job response did not include an upload form.');
    if (typeof providerJobId === 'string') {
      try {
        await deleteProviderJob(providerJobId);
      } catch (error) {
        console.error('Could not clean up an incomplete CloudConvert job.', error);
      }
    }
    return Response.json({ error: 'The conversion provider returned an incomplete response.' }, { status: 502 });
  }

  const accessToken = randomBytes(32).toString('hex');
  try {
    await prisma.documentConversionJob.create({
      data: {
        accessTokenHash: hashToken(accessToken),
        providerJobId,
        mode,
        filename,
        outputFilename,
        expiresAt: new Date(Date.now() + JOB_TTL_MS),
      },
    });
  } catch (error) {
    try {
      await deleteProviderJob(providerJobId);
    } catch (cleanupError) {
      console.error('Could not clean up a CloudConvert job after a database error.', cleanupError);
    }
    throw error;
  }

  return Response.json({ token: accessToken, upload }, { status: 201 });
}

export async function GET(request: Request) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return Response.json({ error: 'A valid conversion token is required.' }, { status: 401 });

  const conversion = await prisma.documentConversionJob.findUnique({
    where: { accessTokenHash: hashToken(accessToken) },
  });
  if (!conversion) return Response.json({ error: 'Conversion job not found.' }, { status: 404 });
  if (conversion.expiresAt <= new Date()) {
    await prisma.documentConversionJob.delete({ where: { id: conversion.id } });
    return Response.json({ error: 'This conversion job has expired.' }, { status: 410 });
  }

  let providerResponse: Response;
  try {
    providerResponse = await cloudConvertRequest(`/jobs/${encodeURIComponent(conversion.providerJobId)}`);
  } catch (error) {
    console.error('Could not check CloudConvert job status.', error);
    return Response.json({ error: 'The conversion provider is temporarily unavailable.' }, { status: 502 });
  }
  if (!providerResponse.ok) {
    console.error(`CloudConvert job status request failed with status ${providerResponse.status}.`);
    return Response.json({ error: 'Could not check conversion status.' }, { status: 502 });
  }

  let providerPayload: unknown;
  try {
    providerPayload = await providerResponse.json();
  } catch {
    console.error('CloudConvert returned invalid JSON while checking job status.');
    return Response.json({ error: 'The conversion provider returned an invalid response.' }, { status: 502 });
  }

  const providerJob = parseProviderJob(providerPayload);
  const status = providerJob && toDatabaseStatus(providerJob.status);
  if (!providerJob || !status) {
    console.error('CloudConvert returned an unknown job status.');
    return Response.json({ error: 'The conversion provider returned an invalid job status.' }, { status: 502 });
  }

  if (status === DocumentConversionStatus.ERROR) {
    await prisma.documentConversionJob.update({ where: { id: conversion.id }, data: { status } });
    return Response.json({ status: 'error' });
  }
  if (status !== DocumentConversionStatus.FINISHED) {
    await prisma.documentConversionJob.update({ where: { id: conversion.id }, data: { status } });
    return Response.json({ status: status.toLowerCase() });
  }

  const preview = getExportFile(providerJob, 'preview-file');
  const download = getExportFile(providerJob, 'download-file');
  if (!preview || !download) {
    console.error('CloudConvert finished the job without both expected output files.');
    await prisma.documentConversionJob.update({
      where: { id: conversion.id },
      data: { status: DocumentConversionStatus.ERROR },
    });
    return Response.json({ status: 'error' });
  }

  await prisma.documentConversionJob.update({
    where: { id: conversion.id },
    data: { status: DocumentConversionStatus.FINISHED, outputFilename: download.filename },
  });
  return Response.json({
    status: 'finished',
    filename: download.filename,
    downloadUrl: download.url,
    previewUrl: preview.url,
  });
}

export async function DELETE(request: Request) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return Response.json({ error: 'A valid conversion token is required.' }, { status: 401 });

  const conversion = await prisma.documentConversionJob.findUnique({
    where: { accessTokenHash: hashToken(accessToken) },
  });
  if (!conversion) return new Response(null, { status: 204 });

  try {
    await deleteProviderJob(conversion.providerJobId);
  } catch (error) {
    console.error('Could not cancel CloudConvert job.', error);
    return Response.json({ error: 'Could not cancel this conversion.' }, { status: 502 });
  }
  await prisma.documentConversionJob.delete({ where: { id: conversion.id } });
  return new Response(null, { status: 204 });
}

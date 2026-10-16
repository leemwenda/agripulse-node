// Image analysis pipeline. Honest by design: reports evidence + uncertainty, never "fraud".
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import {
  ANALYSIS_VERSION, PHASH_NEAR, PHASH_STRONG, MAX_FILE_BYTES, hammingHex, dhashFromGray,
  evaluateMetadata, evaluateQuality, deriveFlags, encodeFlags, safeJoin,
} from './imageAnalysis.logic';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exifr = require('exifr');
sharp.cache(false); sharp.concurrency(1); // small server (~835MB RAM)

export type ImageSourceName = 'animal_photo' | 'market_photo';

// ── Optional AI-image detector plug-in. None is registered by default -> aiStatus "not_run". ──
export interface AiImageDetector { id: string; version: string; threshold: number; limitations: string; detect(buf: Buffer): Promise<{ score: number }>; }
let detector: AiImageDetector | null = null;
export function registerAiDetector(d: AiImageDetector | null) { detector = d; }

// ── Upload roots (animals saved under repo/uploads, market under the staging dir) ──
const ROOTS = [path.resolve(__dirname, '../../uploads'), '/var/www/agripulse-staging/uploads'];
export function resolveImagePath(url: string): string | null {
  if (!url || !url.startsWith('/uploads/')) return null;
  const rel = url.slice('/uploads/'.length);
  for (const root of ROOTS) {
    const full = safeJoin(root, rel);
    if (full && fs.existsSync(full)) return full;
  }
  return null;
}

// ── Serialised queue: one analysis at a time ──
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn);
  chain = p.catch(() => undefined);
  return p;
}
const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('analysis timeout')), ms))]);

export function queueImageAnalysis(source: ImageSourceName, sourceId: number): void {
  setTimeout(() => {
    enqueue(() => analyzeImage(source, sourceId)).catch((e) => console.error('[ImageIntel] failed', source, sourceId, e?.message));
  }, 300);
}

async function loadSource(source: ImageSourceName, id: number) {
  if (source === 'animal_photo') {
    const p = await prisma.animalPhoto.findUnique({ where: { id }, include: { animal: { select: { farmId: true } } } });
    if (!p) return null;
    return { url: p.url, animalId: p.animalId, listingId: null as number | null, farmId: p.animal.farmId, uploaderId: null as number | null, uploadedAt: p.uploadedAt };
  }
  const p = await prisma.marketPhoto.findUnique({ where: { id }, include: { listing: true } });
  if (!p) return null;
  const l = p.listing as any;
  return { url: p.url, animalId: (l.animalId ?? null) as number | null, listingId: p.listingId, farmId: l.sellerId as number, uploaderId: l.sellerId as number, uploadedAt: p.createdAt };
}

export async function analyzeImage(source: ImageSourceName, sourceId: number) {
  return withTimeout(doAnalyze(source, sourceId), 20000).catch(async (e) => {
    const info = await loadSource(source, sourceId).catch(() => null);
    if (!info) return null;
    const data = { url: info.url, animalId: info.animalId, listingId: info.listingId, farmId: info.farmId, uploaderId: info.uploaderId, analysisStatus: 'failed', analysisError: String(e?.message || 'error').slice(0, 250), analyzedAt: new Date(), analysisVer: ANALYSIS_VERSION };
    return prisma.imageRecord.upsert({ where: { source_sourceId: { source, sourceId } }, create: { source, sourceId, ...data }, update: data });
  });
}

async function doAnalyze(source: ImageSourceName, sourceId: number) {
  const info = await loadSource(source, sourceId);
  if (!info) return null;
  const base = { url: info.url, animalId: info.animalId, listingId: info.listingId, farmId: info.farmId, uploaderId: info.uploaderId };
  const existing = await prisma.imageRecord.findUnique({ where: { source_sourceId: { source, sourceId } } });

  const file = resolveImagePath(info.url);
  if (!file) {
    const d = { ...base, analysisStatus: 'file_missing', analysisError: 'Image file not found on disk', analyzedAt: new Date(), analysisVer: ANALYSIS_VERSION, flags: encodeFlags(['file_missing']) };
    return prisma.imageRecord.upsert({ where: { source_sourceId: { source, sourceId } }, create: { source, sourceId, ...d }, update: d });
  }
  const stat = fs.statSync(file);
  if (stat.size > MAX_FILE_BYTES) throw new Error('file too large for analysis');

  const buf = fs.readFileSync(file);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const opts = { limitInputPixels: 40000000, failOn: 'error' };
  const meta = await sharp(buf, opts).metadata();                       // throws if the bytes are not a real image
  if (!['jpeg', 'png', 'webp', 'heif'].includes(meta.format)) throw new Error(`unsupported image format: ${meta.format}`);

  const gray = await sharp(buf, opts).rotate().resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer();
  const phash = dhashFromGray(gray);

  const small = () => sharp(buf, opts).rotate().resize(256, 256, { fit: 'inside' }).greyscale();
  const st = await small().stats();
  const lap = await small().convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], offset: 128 }).stats();
  const width = meta.width || 0, height = meta.height || 0;
  const q = { width, height, sharpness: +lap.channels[0].stdev.toFixed(2), brightness: +st.channels[0].mean.toFixed(1), contrast: +st.channels[0].stdev.toFixed(1) };
  const qualityWarnings = evaluateQuality(q);

  // Metadata (GPS coordinates are never stored, only whether they exist)
  let raw: any = null, parseError = false;
  try { raw = await exifr.parse(buf, { tiff: true, ifd0: true, exif: true, gps: true, xmp: false, icc: false, iptc: false }); } catch { parseError = true; }
  const capturedAt: Date | null = raw?.DateTimeOriginal instanceof Date && !isNaN(raw.DateTimeOriginal.getTime()) ? raw.DateTimeOriginal : null;
  const hasGps = !!raw && (typeof raw.latitude === 'number' || raw.GPSLatitude != null);
  const mv = evaluateMetadata({ parseError, hasAnyExif: !!raw && Object.keys(raw).length > 0, make: raw?.Make, model: raw?.Model, software: raw?.Software, capturedAt, hasGps }, info.uploadedAt);
  const c2pa = buf.includes('c2pa') && buf.includes('jumb'); // marker only; signature NOT verified

  // AI detector (optional plug-in)
  let aiStatus = 'not_run', aiScore: number | null = null, aiThreshold: number | null = null, aiDetector: string | null = null, aiDetectorVer: string | null = null;
  if (detector) {
    aiDetector = detector.id; aiDetectorVer = detector.version; aiThreshold = detector.threshold;
    try { const r = await detector.detect(buf); aiScore = r.score; aiStatus = r.score >= detector.threshold ? 'flagged' : 'no_signal'; }
    catch { aiStatus = 'unavailable'; }
  }

  // Matches: exact (sha256) + perceptual (dHash Hamming distance)
  const others = await prisma.imageRecord.findMany({
    where: { NOT: { id: existing?.id ?? -1 }, OR: [{ sha256 }, { phash: { not: null } }] },
    select: { id: true, sha256: true, phash: true, farmId: true, source: true, sourceId: true },
  });
  const matches: any[] = [];
  for (const o of others) {
    if (o.sha256 === sha256) matches.push({ matchedImageId: o.id, matchType: 'exact', method: 'sha256', score: 0, evidence: { sameFarm: o.farmId === info.farmId } });
    else if (o.phash) {
      const d = hammingHex(phash, o.phash);
      if (d <= PHASH_NEAR) matches.push({ matchedImageId: o.id, matchType: 'perceptual', method: 'dhash64', score: d, evidence: { hammingDistance: d, bits: 64, threshold: PHASH_NEAR, strength: d <= PHASH_STRONG ? 'strong' : 'possible', sameFarm: o.farmId === info.farmId } });
    }
  }
  const exact = matches.filter((m) => m.matchType === 'exact').length;
  const near = matches.length - exact;
  const crossFarm = matches.some((m) => m.evidence.sameFarm === false);
  const { flags, suggestedReview } = deriveFlags({ metaFlags: mv.flags, qualityWarnings, exact, near, crossFarm, c2pa, aiStatus });

  const keepStatus = existing && !['pending', 'needs_review'].includes(existing.reviewStatus);
  const data: any = {
    ...base, sha256, phash, mimeType: `image/${meta.format === 'jpeg' ? 'jpeg' : meta.format}`, width, height, fileSize: stat.size,
    metadataStatus: mv.status, cameraMake: raw?.Make ? String(raw.Make).slice(0, 100) : null, cameraModel: raw?.Model ? String(raw.Model).slice(0, 100) : null,
    software: raw?.Software ? String(raw.Software).slice(0, 150) : null, capturedAt, hasGps, c2paPresent: c2pa,
    exifJson: { orientation: raw?.Orientation ?? null, lens: raw?.LensModel ?? null, notes: mv.notes, c2paNote: c2pa ? 'C2PA marker bytes found; manifest not cryptographically verified.' : null },
    quality: { ...q, warnings: qualityWarnings, note: 'Indicative only; thresholds are uncalibrated.' },
    aiStatus, aiScore, aiThreshold, aiDetector, aiDetectorVer,
    flags: encodeFlags(flags), analysisStatus: 'done', analysisError: null, analysisVer: ANALYSIS_VERSION, analyzedAt: new Date(),
    ...(keepStatus ? {} : { reviewStatus: suggestedReview }),
  };
  const rec = await prisma.imageRecord.upsert({ where: { source_sourceId: { source, sourceId } }, create: { source, sourceId, ...data }, update: data });
  await prisma.imageMatch.deleteMany({ where: { imageId: rec.id } });
  if (matches.length) await prisma.imageMatch.createMany({ data: matches.map((m) => ({ ...m, imageId: rec.id })), skipDuplicates: true });
  return rec;
}

export async function backfillImages(limit = 200) {
  const out = { analyzed: 0, failed: 0, remaining: 0 };
  for (const source of ['animal_photo', 'market_photo'] as ImageSourceName[]) {
    const done = new Set((await prisma.imageRecord.findMany({ where: { source }, select: { sourceId: true } })).map((r: any) => r.sourceId));
    const all: { id: number }[] = source === 'animal_photo'
      ? await prisma.animalPhoto.findMany({ select: { id: true }, orderBy: { id: 'asc' } })
      : await prisma.marketPhoto.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
    const todo = all.filter((p) => !done.has(p.id));
    for (const p of todo.slice(0, Math.max(0, limit - out.analyzed - out.failed))) {
      const r: any = await enqueue(() => analyzeImage(source, p.id));
      if (r && r.analysisStatus === 'done') out.analyzed++; else out.failed++;
    }
    out.remaining += Math.max(0, todo.length - (out.analyzed + out.failed));
  }
  return out;
}

// ── Automatic sweep: retries pending/failed analyses and analyzes photos that have no record yet.
// Runs one sweep at a time. Uses the same serialised queue as uploads and backfill.
let sweepRunning = false;
export async function sweepImageAnalysis(limit = 25): Promise<Record<string, number | boolean>> {
  if (sweepRunning) return { skipped: true };
  sweepRunning = true;
  try {
    const stuck = await prisma.imageRecord.findMany({
      where: { analysisStatus: { in: ['pending', 'failed'] } },
      select: { source: true, sourceId: true },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
    let retried = 0;
    for (const r of stuck) {
      const out: any = await enqueue(() => analyzeImage(r.source as ImageSourceName, r.sourceId));
      if (out && out.analysisStatus === 'done') retried++;
    }
    const missing = await backfillImages(limit);
    return { retried, checked: stuck.length, analyzed: missing.analyzed, failed: missing.failed, remaining: missing.remaining };
  } finally {
    sweepRunning = false;
  }
}

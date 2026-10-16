// Pure helpers (no I/O) so they can be unit-tested. Everything here is *evidence*, never a verdict.
import path from 'path';

export const ANALYSIS_VERSION = 'imgintel-1.0.0';
export const PHASH_NEAR = Number(process.env.IMAGE_PHASH_THRESHOLD ?? 8);   // max Hamming distance (of 64) for a "possible match"
export const PHASH_STRONG = 4;                                             // very close
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
const HEX = /^[0-9a-f]+$/i;

/** Hamming distance between two equal-length hex strings. Infinity if invalid. */
export function hammingHex(a: string, b: string): number {
  if (!a || !b || a.length !== b.length || !HEX.test(a) || !HEX.test(b)) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) d += POP[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  return d;
}

/** 64-bit difference hash from a 9x8 greyscale pixel array (72 values). */
export function dhashFromGray(px: ArrayLike<number>): string {
  if (px.length < 72) throw new Error('need 72 pixels');
  let hex = '', nib = 0, n = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    nib = (nib << 1) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1 : 0);
    if (++n === 4) { hex += nib.toString(16); nib = 0; n = 0; }
  }
  return hex;
}

export interface RawMeta {
  parseError: boolean; hasAnyExif: boolean;
  make?: string | null; model?: string | null; software?: string | null;
  capturedAt?: Date | null; hasGps?: boolean;
}
const AI_TOOL_RE = /stable ?diffusion|midjourney|dall[-· ]?e|firefly|comfyui|automatic1111|openai|gemini|imagen|flux/i;
const EDIT_RE = /photoshop|lightroom|gimp|snapseed|canva|picsart|pixlr|facetune|affinity/i;

export function evaluateMetadata(m: RawMeta, uploadedAt: Date) {
  const flags: string[] = []; const notes: string[] = [];
  if (m.parseError) return { status: 'invalid', flags: ['invalid_metadata'], notes: ['Metadata block could not be parsed.'] };
  if (!m.hasAnyExif) return { status: 'absent', flags: ['no_metadata'], notes: ['No EXIF found. Many apps strip metadata, so this alone proves nothing.'] };
  let status = 'present';
  if (m.capturedAt) {
    const t = m.capturedAt.getTime();
    if (t > uploadedAt.getTime() + 86400000 || m.capturedAt.getUTCFullYear() < 2000) {
      status = 'inconsistent'; flags.push('inconsistent_metadata');
      notes.push('Capture time is in the future relative to upload or implausibly old.');
    }
  }
  if (m.software) {
    if (AI_TOOL_RE.test(m.software)) { flags.push('ai_tool_in_metadata'); notes.push(`Software tag names a generative tool: "${m.software}". Tags can be edited.`); }
    else if (EDIT_RE.test(m.software)) { flags.push('editing_software'); notes.push(`Editing software tag: "${m.software}". Editing is not the same as fabrication.`); }
  }
  return { status, flags, notes };
}

export function evaluateQuality(q: { width: number; height: number; sharpness: number; brightness: number; contrast: number }) {
  const w: string[] = [];
  if (Math.min(q.width, q.height) < 640) w.push('low_resolution');
  if (q.sharpness < 5) w.push('possibly_blurry');
  if (q.brightness < 40) w.push('too_dark');
  if (q.brightness > 220) w.push('too_bright');
  if (q.contrast < 25) w.push('low_contrast');
  return w; // indicative only, uncalibrated; never used to reject an image
}

export function deriveFlags(i: {
  metaFlags: string[]; qualityWarnings: string[]; exact: number; near: number;
  crossFarm: boolean; c2pa: boolean; aiStatus: string; fileMissing?: boolean;
}) {
  const f = [...i.metaFlags];
  if (i.fileMissing) f.push('file_missing');
  if (i.exact > 0) f.push('exact_duplicate');
  if (i.near > 0) f.push('near_duplicate');
  if (i.crossFarm) f.push('cross_farm_match');
  if (i.c2pa) f.push('c2pa_present');
  if (i.aiStatus === 'flagged') f.push('ai_detector_flag');
  if (i.qualityWarnings.length) f.push('quality_warning');
  const needsReview = i.exact > 0 || i.near > 0 || f.includes('ai_tool_in_metadata') || i.aiStatus === 'flagged';
  return { flags: Array.from(new Set(f)), suggestedReview: needsReview ? 'needs_review' : 'pending' };
}

export const encodeFlags = (f: string[]) => (f.length ? `,${f.join(',')},` : '');
export const decodeFlags = (s: string | null | undefined) => (s ? s.split(',').filter(Boolean) : []);

/** Join rel onto root; null if the result would escape root (path traversal). */
export function safeJoin(root: string, rel: string): string | null {
  if (!rel || rel.includes('\0')) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, rel);
  return full.startsWith(base + path.sep) ? full : null;
}

export const REVIEW_MAP: Record<string, 'reviewed' | 'needs_review' | 'confirmed_issue' | 'inconclusive'> = {
  legitimate: 'reviewed', suspicious: 'needs_review', confirmed: 'confirmed_issue', inconclusive: 'inconclusive',
};

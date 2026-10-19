// Pure upload checks. No I/O, so they are unit-testable.
const EXT_OK: Record<string, string> = { '.jpg': '.jpg', '.jpeg': '.jpg', '.png': '.png', '.webp': '.webp' };
const MIME_OK = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Returns a normalised extension, or null when the name or declared type is not an allowed image.
export function safeExtension(originalName: string, mime: string): string | null {
  const dot = originalName.lastIndexOf('.');
  const ext = dot >= 0 ? originalName.slice(dot).toLowerCase() : '';
  const norm = EXT_OK[ext];
  if (!norm || !MIME_OK.has((mime || '').toLowerCase())) return null;
  return norm;
}

// Identifies the real format from the first bytes. Ignores the filename and declared type.
export function sniffImageType(head: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (head.length >= 12 && head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

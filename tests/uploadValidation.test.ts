import { describe, it, expect } from 'vitest';
import { safeExtension, sniffImageType } from '../src/services/uploadValidation';

describe('safeExtension', () => {
  it('accepts jpg, png, webp and normalises jpeg', () => {
    expect(safeExtension('a.JPG', 'image/jpeg')).toBe('.jpg');
    expect(safeExtension('a.jpeg', 'image/jpeg')).toBe('.jpg');
    expect(safeExtension('a.png', 'image/png')).toBe('.png');
    expect(safeExtension('a.webp', 'image/webp')).toBe('.webp');
  });
  it('rejects scripts, double extensions, missing extension and wrong mime', () => {
    expect(safeExtension('a.php', 'image/jpeg')).toBeNull();
    expect(safeExtension('a.jpg.php', 'image/jpeg')).toBeNull();
    expect(safeExtension('noext', 'image/jpeg')).toBeNull();
    expect(safeExtension('a.jpg', 'text/html')).toBeNull();
    expect(safeExtension('a.svg', 'image/svg+xml')).toBeNull();
  });
});

describe('sniffImageType', () => {
  it('detects real formats from magic bytes', () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('jpeg');
    expect(sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe('png');
    expect(sniffImageType(Buffer.from('RIFF\0\0\0\0WEBP', 'latin1'))).toBe('webp');
  });
  it('rejects text, html and empty content', () => {
    expect(sniffImageType(Buffer.from('<html><body>'))).toBeNull();
    expect(sniffImageType(Buffer.from('GIF89a......'))).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
  });
});

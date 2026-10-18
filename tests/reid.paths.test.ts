import { describe, it, expect } from 'vitest';
import path from 'path';
import { resolveUploadPath } from '../src/services/reid.logic';

const ROOT = path.resolve('/srv/app/uploads');

describe('resolveUploadPath', () => {
  it('accepts animal photos inside the upload root', () => {
    expect(resolveUploadPath(ROOT, '/uploads/animals/123-abc.jpeg')).toBe(path.join(ROOT, 'animals', '123-abc.jpeg'));
  });
  it('rejects path traversal out of the upload root', () => {
    expect(resolveUploadPath(ROOT, '/uploads/animals/../../etc/passwd')).toBeNull();
    expect(resolveUploadPath(ROOT, '/uploads/animals/../../../../root/.ssh/id_rsa')).toBeNull();
  });
  it('rejects other folders, absolute paths and odd input', () => {
    expect(resolveUploadPath(ROOT, '/uploads/market/x.jpg')).toBeNull();
    expect(resolveUploadPath(ROOT, '/etc/passwd')).toBeNull();
    expect(resolveUploadPath(ROOT, 'animals/x.jpg')).toBeNull();
    expect(resolveUploadPath(ROOT, '/uploads/animals/x\\..\\y')).toBeNull();
    expect(resolveUploadPath(ROOT, '/uploads/animals/x\0.jpg')).toBeNull();
  });
});

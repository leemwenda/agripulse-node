import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

let counter = 0;
if (!URL.createObjectURL) URL.createObjectURL = () => `blob:test-${++counter}`;
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => undefined;

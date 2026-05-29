import { beforeAll, vi } from 'vitest';
import seed from '../db/seed';

beforeAll(() => {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  seed();
  spy.mockRestore();
});

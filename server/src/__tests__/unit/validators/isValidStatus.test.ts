import { describe, expect, it } from 'vitest';
import { isValidStatus } from '../../../validators/isValidStatus';

describe('isValidStatus', () => {
  it.each(['going', 'not_going', 'maybe'])('accepts "%s"', (status) => {
    expect(isValidStatus(status)).toBe(true);
  });

  it.each(['', 'yes', 'no', 'GOING', 'going ', 'Going'])(
    'rejects "%s"',
    (status) => {
      expect(isValidStatus(status)).toBe(false);
    },
  );

  it.each([null, undefined, 123])(
    'returns false for %s without throwing',
    (value) => {
      expect(isValidStatus(value as any)).toBe(false);
    },
  );
});

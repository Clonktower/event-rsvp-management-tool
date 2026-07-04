import { describe, expect, it } from 'vitest';
import { getUserFromUsersById } from '../../utils/getUserFromUsersById';
import type { User } from '../../types/User';

function user(id: string): User {
  return { id, token: `tok-${id}` };
}

describe('getUserFromUsersById', () => {
  it('returns the user matching the given id', () => {
    const users = [user('u1'), user('u2')];
    expect(getUserFromUsersById('u2', users)).toEqual(user('u2'));
  });

  it('returns undefined when the id does not match any user', () => {
    expect(getUserFromUsersById('ghost', [user('u1')])).toBeUndefined();
  });

  it('returns undefined for an empty list', () => {
    expect(getUserFromUsersById('u1', [])).toBeUndefined();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { authenticateAdmin, isAdminRequest } from '../../../middlewares/auth';
import type { NextFunction, Request, Response } from 'express';

// ⚠️ WARNING: this is NOT real HTTP Basic Auth, and the tests below pin the
// broken behavior on purpose (so a fix shows up as an intentional change, not a
// silent regression). Two things are wrong with the implementation:
//
//   1. NON-STANDARD ENCODING. RFC 7617 ("HTTP Basic auth") requires the header
//      to be `Authorization: Basic base64("user:pass")`. This code instead sends
//      and compares the *raw* `user:pass` string after stripping "Basic ". It
//      only works because the client is broken in the exact same way. A standards
//      -compliant proxy/CDN/browser, or any `:`/space/`%` in the credentials,
//      breaks it. The fix is to base64-encode/decode the credentials.
//   2. NOT CONSTANT-TIME. The compare uses `===`, which short-circuits on the
//      first differing byte and leaks timing information about the secret. A real
//      implementation should use `crypto.timingSafeEqual` (after a length check).
//
// When either is fixed, expect the assertions in this file to change.

// Credentials as set in vitest.config.ts env
const VALID = 'Basic testadmin:testpass';
const WRONG_PASS = 'Basic testadmin:wrong';
const WRONG_SCHEME = 'Bearer testadmin:testpass';

function req(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as unknown as Request;
}

function res(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('isAdminRequest', () => {
  it('returns true for correct credentials', () => {
    // Note the credentials are raw, NOT base64 ("dGVzdGFkbWluOnRlc3RwYXNz").
    // Real Basic auth would reject this raw form; this bespoke scheme requires it.
    expect(isAdminRequest(req(VALID))).toBe(true);
  });

  it('returns false when Authorization header is absent', () => {
    expect(isAdminRequest(req())).toBe(false);
  });

  it('returns false for wrong password', () => {
    expect(isAdminRequest(req(WRONG_PASS))).toBe(false);
  });

  it('returns false for non-Basic scheme', () => {
    expect(isAdminRequest(req(WRONG_SCHEME))).toBe(false);
  });

  it.each([
    ['no space after Basic', 'Basic'],
    ['space but no credentials', 'Basic '],
    ['leading space before Basic', ' Basic testadmin:testpass'],
  ])('returns false for malformed header: %s', (_, header) => {
    expect(isAdminRequest(req(header))).toBe(false);
  });

  it('returns false for lowercase scheme (basic ...)', () => {
    expect(isAdminRequest(req('basic testadmin:testpass'))).toBe(false);
  });

  it('returns false when password contains a colon (mismatched credentials)', () => {
    // header: Basic testadmin:pa:ss — replace('Basic ','') yields testadmin:pa:ss
    // which does not equal testadmin:testpass
    expect(isAdminRequest(req('Basic testadmin:pa:ss'))).toBe(false);
  });

  it('returns false for prefix duplication (Basic Basic ...)', () => {
    // replace('Basic ','') is not global — yields 'Basic testadmin:testpass'
    expect(isAdminRequest(req('Basic Basic testadmin:testpass'))).toBe(false);
  });

  it('returns false for empty password (Basic testadmin:)', () => {
    expect(isAdminRequest(req('Basic testadmin:'))).toBe(false);
  });

  it('returns false when credentials have trailing whitespace', () => {
    expect(isAdminRequest(req('Basic testadmin:testpass '))).toBe(false);
  });
});

describe('authenticateAdmin', () => {
  it('calls next() for valid credentials', () => {
    const next = vi.fn() as unknown as NextFunction;
    authenticateAdmin(req(VALID), res(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401 and does not call next() for missing credentials', () => {
    const next = vi.fn() as unknown as NextFunction;
    const r = res();
    authenticateAdmin(req(), r, next);
    expect(r.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for wrong password', () => {
    const next = vi.fn() as unknown as NextFunction;
    const r = res();
    authenticateAdmin(req(WRONG_PASS), r, next);
    expect(r.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

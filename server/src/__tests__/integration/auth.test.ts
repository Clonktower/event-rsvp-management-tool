import { describe, expect, it } from 'vitest';
import request from 'supertest';
import server from './testServer';

const VALID = 'Basic testadmin:testpass';
const WRONG = 'Basic testadmin:wrong';

describe('POST /admin/login', () => {
  it('returns 200 for valid credentials', async () => {
    await request(server).post('/admin/login').set('Authorization', VALID).expect(200);
  });

  it('returns 401 for wrong credentials', async () => {
    await request(server).post('/admin/login').set('Authorization', WRONG).expect(401);
  });

  it('returns 401 when Authorization header is absent', async () => {
    await request(server).post('/admin/login').expect(401);
  });
});

describe('Admin route auth guard', () => {
  it('rejects GET /admin/events without credentials', async () => {
    await request(server).get('/admin/events').expect(401);
  });

  it('rejects POST /admin/create-event without credentials', async () => {
    await request(server).post('/admin/create-event').send({}).expect(401);
  });

  it.each([
    ['PATCH', '/admin/events/placeholder-id'],
    ['DELETE', '/admin/events/placeholder-id'],
    ['DELETE', '/admin/events/rsvp/placeholder-id'],
    ['POST', '/admin/events/placeholder-id/poll'],
    ['PATCH', '/admin/polls/placeholder-id/close'],
    ['PATCH', '/admin/polls/placeholder-id/reopen'],
    ['PATCH', '/admin/polls/placeholder-id'],
    ['DELETE', '/admin/polls/placeholder-id'],
  ])('%s %s returns 401 without credentials', async (method, path) => {
    await (request(server) as any)[method.toLowerCase()](path).send({}).expect(401);
  });
});

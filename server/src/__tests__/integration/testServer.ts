import app from '../../app';
import type { Server } from 'node:http';

// One listening server per test file (Vitest isolates module state per file),
// reused across every request in that file. This avoids Supertest spinning up —
// and tearing down — an ephemeral server for each individual `request(app)`
// call, which under Vitest's parallel workers intermittently stalls or drops
// connections and makes the HTTP tests flaky. Pass this to `request(server)`.
const server: Server = app.listen(0);

export default server;

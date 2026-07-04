# Event RSVP Management Tool - Server

## Tech Stack
- Node.js
- Express.js
- better-sqlite-3 (SQLite)
- TypeScript

## Prerequisites
- Node.js
- Yarn (for dependency management)

## Environment Variables
Copy `.env.example` to `.env` and fill in your values:

```
PORT=3000
NODE_ENV=development
ADMIN_USER=your_admin_user
ADMIN_PASSWORD=your_admin_password
SQLITE_DB_PATH=./data/event_rsvp.db # optional, default is ./data/event_rsvp.db
```

## Setup
1. Install dependencies:
   ```sh
   yarn
   ```
2. Start the server:
   ```sh
   yarn start
   ```

## API Routes

### Admin (require Basic Auth)
- `POST   /admin/login` — Authenticate admin
- `POST   /admin/create-event` �� Create a new event
- `GET    /admin/events` — Get all events
- `DELETE /admin/events/:id` — Delete an event by ID

### Public
- `GET    /events/:id` — Get event by ID
- `POST   /events/:id/rsvp` — RSVP to an event

## Testing

Run the unit test suite:
```sh
yarn test
```

Run in watch mode during development:
```sh
yarn test:watch
```

Tests live in `src/__tests__/unit/` and cover middleware, services, and validators.

## Notes
- All admin routes require a Basic Authorization header: `Basic USER:PASS` (credentials from `.env`).
- Uses SQLite for storage (no external DB required).
- Data file defaults to `data/event_rsvp.db` (relative to the `server/` directory).

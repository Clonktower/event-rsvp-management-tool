# Event RSVP Management Tool

A simple minimal web application for managing events and RSVPs. Users can create events, RSVP to events, and view attendee lists. The app supports attendee limits, guest counts, and a modern, responsive UI with dark mode support.

---

## Tech Stack

- **Frontend:** SvelteKit, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **Other:** Vite, ESLint, Prettier

---

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- PostgreSQL (running locally or accessible remotely)

---

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd event-rsvp-management-tool
   ```

2. **Install dependencies:**
   - For the client:
     ```bash
     cd client
     npm install
     ```
   - For the server:
     ```bash
     cd ../server
     npm install
     ```

3. **Configure environment variables:**
   - Set up your PostgreSQL connection string in the server's config (see `server/src/db/index.ts`).

4. **Seed the database:**
   ```bash
   cd server
   npm run seed
   ```

5. **Run the development servers:**
   - Start the backend:
     ```bash
     npm run dev
     ```
   - Start the frontend:
     ```bash
     cd ../client
     npm run dev
     ```

---

## Routes

### Frontend (SvelteKit)

- `/` — Home page, event list
- `/create-event` — Create a new event
- `/events/[id]` — Event details, RSVP form, attendee list

### Backend (Express API)

- `GET /events` — List all events
- `GET /events/:id` — Get event details and RSVPs
- `POST /events` — Create a new event
- `POST /events/:id/rsvp` — RSVP to an event (add or update)

---

## Features

- Create and manage events
- RSVP with guest count
- Attendee list with real-time updates
- RSVP limit enforcement
- Dark mode support
- Toast notifications for actions

---

## License

MIT

---

## Notes

- This project uses **Yarn** as the package manager. Use `yarn install` and `yarn dev` instead of `npm install` and `npm run dev` for both client and server setup.

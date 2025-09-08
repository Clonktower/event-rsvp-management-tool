# Event RSVP Management Tool

A simple minimal web application for managing events and RSVPs. Users can create events, RSVP to events, and view attendee lists. The app supports attendee limits, guest counts, and a modern, responsive UI with dark mode support.

---

## Tech Stack

- **Frontend:** SvelteKit, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite
- **Other:** Vite, ESLint, Prettier

---

## Prerequisites

- Node.js
- yarn

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
     yarn
     ```
   - For the server:
     ```bash
     cd ../server
     yarn
     ```

3. **Configure environment variables:**
   - Set up env variables based on `.env.example`. See `/server.README.md` for more details.

4. **Run the development servers:**
   - Start the backend:
     ```bash
     yarn dev
     ```
   - Start the frontend:
     ```bash
     cd ../client
     yarn dev
     ```

---

## Routes

### Frontend (SvelteKit)

- `/create-event` — Create a new event
- `/events` — List all events (admin only)
- `/events/[id]` — Event details, RSVP form, attendee list
- `/admin/login` — Admin login page

### Backend (Express API)

#### Admin (Protected)
- `POST /admin/login` — Authenticate admin
- `POST /admin/create-event` — Create a new event
- `GET /admin/events` — Get all events
- `DELETE /admin/events/:id` — Delete an event

#### Public
- `GET /events/:id` — Get event details and RSVPs
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

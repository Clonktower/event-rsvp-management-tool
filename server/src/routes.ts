import { Router } from "express";
import { eventController } from "./controllers/eventController";
import { rsvpController } from './controllers/rsvpController';
import {authenticateAdmin} from "./middlewares/auth";

const router = Router();

// Admin routes
router.post("/admin/login", authenticateAdmin, (_, res) => res.status(200).send())
router.post("/admin/create-event", authenticateAdmin, eventController.createEvent);
router.get("/admin/events", authenticateAdmin, eventController.getAllEvents);
router.delete("/admin/events/:id", authenticateAdmin, eventController.deleteEvent);

// Public routes
router.get("/events/:id", eventController.getEventById);
router.post("/events/:id/rsvp", rsvpController.rsvpToEvent);

export default router;

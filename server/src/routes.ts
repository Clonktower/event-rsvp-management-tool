import { Router } from "express";
import { eventController } from "./controllers/eventController";
import { rsvpController } from './controllers/rsvpController';

const router = Router();

router.post("/create-event", eventController.createEvent);
router.get("/events/:id", eventController.getEventById);
router.post("/events/:id/rsvp", rsvpController.rsvpToEvent);

export default router;

import { Router } from "express";
import { eventController } from "./controllers/eventController";
import { rsvpController } from './controllers/rsvpController';
import { pollController } from './controllers/pollController';
import {authenticateAdmin} from "./middlewares/auth";

const router = Router();

// Admin routes
router.post("/admin/login", authenticateAdmin, (_, res) => res.status(200).send())
router.post("/admin/create-event", authenticateAdmin, eventController.createEvent);
router.get("/admin/events", authenticateAdmin, eventController.getAllEvents);
router.patch("/admin/events/:id", authenticateAdmin, eventController.updateEvent);
router.delete("/admin/events/:id", authenticateAdmin, eventController.deleteEvent);
router.delete("/admin/events/rsvp/:id", authenticateAdmin, rsvpController.deleteRsvp);
router.post("/admin/events/:id/poll", authenticateAdmin, pollController.createPollController);
router.patch("/admin/polls/:id/close", authenticateAdmin, pollController.closePollController);
router.patch("/admin/polls/:id/reopen", authenticateAdmin, pollController.reopenPollController);
router.patch("/admin/polls/:id", authenticateAdmin, pollController.updatePollController);
router.delete("/admin/polls/:id", authenticateAdmin, pollController.deletePollController);

// Public routes
router.get("/events/:id", eventController.getEventById);
router.post("/events/:id/rsvp", rsvpController.rsvpToEvent);
router.patch("/events/:id/rsvp/:rsvpId", rsvpController.updateRsvpByTokenController);
router.post("/rsvps/my", rsvpController.getMyRsvps);
router.post("/polls/:id/vote", pollController.castVotesController);

export default router;

import { Router } from "express";
import { eventController } from "./controllers/eventController";

const router = Router();

router.post("/create-event", eventController.createEvent);
router.get("/events/:id", eventController.getEventById);

export default router;

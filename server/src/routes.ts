import { Router } from "express";
import * as eventController from "./controllers/eventController";

const router = Router();

router.post("/create-event", eventController.createEvent);

export default router;


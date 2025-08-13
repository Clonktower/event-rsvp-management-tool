import { Request, Response } from "express";
import { createEvent as createEventService } from "../services/event";
import { errorHandler } from '../utils/errorHandler';

export const createEvent = async (req: Request, res: Response, next: Function) => {
  const { name, date, startTime, endTime, maxAttendees, location } = req.body;
  if (!name || !date || !location || !startTime) {
    return res.status(400).json({ error: "Name, date, startTime, and location are required." });
  }
  try {
    const event = await createEventService({ name, date, startTime, endTime, maxAttendees, location });
    res.status(201).json({
      message: "Event created successfully!",
      event
    });
  } catch (err) {
    next(err);
  }
};

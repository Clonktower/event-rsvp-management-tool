import { Request, Response } from "express";

export const createEvent = (req: Request, res: Response) => {
  const { name, date, startTime, endTime, maxAttendees, location } = req.body;
  if (!name || !date || !location) {
    return res.status(400).json({ error: "Name, date, and location are required." });
  }

  res.status(201).json({
    message: "Event created successfully!",
    event: { name, date, startTime, endTime, maxAttendees, location }
  });
};



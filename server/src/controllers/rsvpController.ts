import { Request, Response } from "express";
import { rsvpToEventService, deleteRsvpById } from "../services/rsvp";

export const rsvpToEvent = async (req: Request, res: Response, next: Function) => {
  try {
    const { id } = req.params;
    let { attendeeId, name, status, guests } = req.body;
    if (!name || !status) {
      return res.status(400).json({ error: "Name and RSVP status are required." });
    }
    if (!attendeeId) {
      // Generate a new UUID for attendeeId if not provided
      attendeeId = require('uuid').v4();
    }
    const rsvp = await rsvpToEventService({ eventId: id, attendeeId, name, status, guests });
    res.status(201).json({ message: "RSVP recorded!", rsvp });
  } catch (err) {
    next(err);
  }
};

// Deletes an RSVP by id
export const deleteRsvp = async (req: Request, res: Response, next: Function) => {
  try {
    const { id } = req.params;
    const result = deleteRsvpById(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "RSVP not found or already deleted" });
    }
    res.status(200).json({ message: "RSVP deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const rsvpController = {
  rsvpToEvent,
  deleteRsvp,
};
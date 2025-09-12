import { Request, Response } from "express";
import { rsvpToEventServiceLegacy, deleteRsvpById, rsvpToEventService, updateRsvpByToken } from "../services/rsvp";

const legacyEventIds: string[]  = ["fe7e8308-386d-499d-bc74-dfaf21e34a9f"]

export const rsvpToEvent = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: eventId } = req.params;
    let { attendeeId, name, status, guests } = req.body;
    if (!name || !status) {
      return res.status(400).json({ error: "Name and RSVP status are required." });
    }
    if (!attendeeId) {
      // Generate a new UUID for attendeeId if not provided
      attendeeId = require('uuid').v4();
    }

    if(eventId in legacyEventIds) {
      const rsvp = await rsvpToEventServiceLegacy({ eventId, attendeeId, name, status, guests });
      res.status(201).json({ message: "RSVP recorded!", rsvp });
    } else {
      const rsvp = await rsvpToEventService({ id: attendeeId, eventId, name, status, guests });
      res.status(201).json({ message: "RSVP recorded!", rsvp });
    }

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

export const updateRsvpByTokenController = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: eventId, rsvpId } = req.params;
    const { token, name, status, guests } = req.body;
    if (!token || !name || !status === undefined) {
      return res.status(400).json({ error: "Token, name, status, and guests are required." });
    }
    const updated = updateRsvpByToken({ eventId, rsvpId, token, name, status, guests });
    if (!updated) {
      return res.status(404).json({ error: "RSVP not found or token invalid." });
    }
    res.status(200).json({ message: "RSVP updated!", rsvp: updated });
  } catch (err) {
    next(err);
  }
};

export const rsvpController = {
  rsvpToEvent,
  deleteRsvp,
  updateRsvpByTokenController,
};
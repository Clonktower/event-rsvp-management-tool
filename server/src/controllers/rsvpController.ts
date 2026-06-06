import { Request, Response } from "express";
import { deleteRsvpById, rsvpToEventService, updateRsvpByToken, runDrawForEvent, ADMIN_PRIORITY_WEIGHT } from "../services/rsvp";
import { getEventById as getEventByIdService } from "../services/event";
import { isValidStatus } from "../validators/isValidStatus";
import { getMyRsvpsService } from '../services/rsvp';
import { isAdminRequest } from "../middlewares/auth";

export const rsvpToEvent = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: eventId } = req.params;
    let { attendeeId, name, status, guests } = req.body;

    if (!name || !status) {
      return res.status(400).json({ error: "Name and RSVP status are required." });
    }

    if(!isValidStatus(status)) {
      return res.status(400).json({ error: "Invalid RSVP status. Must be 'going', 'not_going', or 'maybe'." });
    }

    const event = await getEventByIdService(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    const isAdmin = isAdminRequest(req);

    // In lottery mode the draw is the gate, so there is no registration-opening
    // rush to enforce; sign-ups stay open through the entry window. The FIFO path
    // keeps the existing registrationOpensAt gate.
    const isLottery = (event as any).selection_mode === 'lottery';
    const registrationOpensAt = (event as any).registration_opens_at as string | null;
    if (!isLottery && registrationOpensAt && Date.now() < new Date(registrationOpensAt).getTime() - 1000) {
      if (!isAdmin) {
        return res.status(403).json({ error: "Registration not yet open.", registrationOpensAt });
      }
    }

    if (!attendeeId) {
      attendeeId = require('uuid').v4();
    }

    const priorityWeight = isAdmin ? ADMIN_PRIORITY_WEIGHT : 0;
    const rsvp = await rsvpToEventService({ id: attendeeId, eventId, name, status, guests, priorityWeight });
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

export const updateRsvpByTokenController = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: eventId, rsvpId } = req.params;
    const { token, name, status, guests } = req.body;

    if (!token || !name || !status) {
      return res.status(400).json({ error: "Token, name, status, and guests are required." });
    }

    if(!isValidStatus(status)) {
      return res.status(400).json({ error: "Invalid RSVP status. Must be 'going', 'not_going', or 'maybe'." });
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

// Admin-triggered lottery draw. Assigns a position to every 'going' RSVP. Only
// valid for lottery events, and guarded against re-running once a draw has
// happened (so attendees who already saw they were in are not reshuffled).
export const drawLottery = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: eventId } = req.params;

    const event = await getEventByIdService(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    if ((event as any).selection_mode !== 'lottery') {
      return res.status(400).json({ error: "Event is not in lottery mode." });
    }
    if ((event as any).drawn_at) {
      return res.status(409).json({ error: "Lottery has already been drawn for this event." });
    }

    const drawnAt = runDrawForEvent(eventId);
    res.status(200).json({ message: "Lottery drawn!", drawnAt });
  } catch (err) {
    next(err);
  }
};

export const getMyRsvps = async (req: Request, res: Response, next: Function) => {
  try {
    const pairs = req.body.myRsvps;

    if (!Array.isArray(pairs)) {
      return res.status(400).json({ error: 'Request body must be an array of {rsvpId, eventId} objects.' });
    }

    const results = await getMyRsvpsService(pairs);
    res.status(200).json({ rsvps: results.filter(Boolean) });
  } catch (err) {
    next(err);
  }
};

export const rsvpController = {
  rsvpToEvent,
  deleteRsvp,
  updateRsvpByTokenController,
  drawLottery,
  getMyRsvps
};
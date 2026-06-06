import { Request, Response } from "express";
import { createEvent as createEventService, getEventById as getEventByIdService, getAllEvents as getAllEventsService, deleteEvent as deleteEventService, updateEvent as updateEventService } from "../services/event";
import { getRsvpByEventId } from '../services/rsvp';
import { getPollByEventId } from '../services/poll';
import { generateIcs } from '../utils/generateIcs';

export const createEvent = async (req: Request, res: Response, next: Function) => {
  const { name, date, startTime, endTime, maxAttendees, location, registrationOpensAt, selectionMode } = req.body;
  if (!name || !date || !location || !startTime || !endTime) {
    return res.status(400).json({ error: "Name, date, startTime, endTime, and location are required." });
  }
  if (endTime <= startTime) {
    return res.status(400).json({ error: "endTime must be after startTime." });
  }
  if (selectionMode !== undefined && selectionMode !== 'fifo' && selectionMode !== 'lottery') {
    return res.status(400).json({ error: "selectionMode must be 'fifo' or 'lottery'." });
  }
  try {
    const event = await createEventService({ name, date, startTime, endTime, maxAttendees, location, registrationOpensAt, selectionMode });
    res.status(201).json({
      message: "Event created successfully!",
      event
    });
  } catch (err) {
    next(err);
  }
};

export const getEventById = async (req: Request, res: Response, next: Function) => {
  try {
    const { id } = req.params;

    const event = await getEventByIdService(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    // Fetch attendees for this event using the service
    const attendees = await getRsvpByEventId(id);
    const poll = getPollByEventId(id);
    res.status(200).json({ event, rsvp: attendees, poll, serverTime: Date.now() });
  } catch (err) {
    next(err);
  }
};

// Serves the event as a real .ics file. iOS Safari 26.6+ ignores the
// data:text/calendar URL the calendar button builds by default, so the client
// points its icsFile option here instead.
export const getEventCalendar = async (req: Request, res: Response, next: Function) => {
  try {
    const { id } = req.params;

    const event = await getEventByIdService(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Rows come back with the database's snake_case column names.
    const row = event as unknown as {
      id: string;
      name: string;
      date: string;
      start_time: string;
      end_time?: string | null;
      location?: string | null;
      created_at?: string | null;
    };

    const ics = generateIcs({
      id: row.id,
      name: row.name,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      createdAt: row.created_at,
    });

    // No Content-Disposition: iOS opens the calendar preview when the file is
    // served plainly, and an attachment disposition would force a download.
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(ics);
  } catch (err) {
    next(err);
  }
};

export const getAllEvents = async (req: Request, res: Response, next: Function) => {
  try {
    const events = await getAllEventsService();
    res.status(200).json({ events });
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req: Request, res: Response, next: Function) => {
  const { id } = req.params;
  const { name, date, startTime, endTime, maxAttendees, location, registrationOpensAt, selectionMode } = req.body;
  if (endTime && startTime && endTime <= startTime) {
    return res.status(400).json({ error: "endTime must be after startTime." });
  }
  if (selectionMode !== undefined && selectionMode !== 'fifo' && selectionMode !== 'lottery') {
    return res.status(400).json({ error: "selectionMode must be 'fifo' or 'lottery'." });
  }
  try {
    const event = await updateEventService(id, { name, date, startTime, endTime, maxAttendees, location, registrationOpensAt, selectionMode });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json({ message: "Event updated successfully!", event });
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: Function) => {
  try {
    const { id } = req.params;
    const deleted = await deleteEventService(id);
    if (!deleted) {
      return res.status(404).json({ error: "Event not found or already deleted" });
    }
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const eventController = {
  createEvent,
  getEventById,
  getEventCalendar,
  getAllEvents,
  updateEvent,
  deleteEvent,
};

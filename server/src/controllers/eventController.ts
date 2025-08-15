import { Request, Response } from "express";
import { createEvent as createEventService, getEventById as getEventByIdService, getAllEvents as getAllEventsService, deleteEvent as deleteEventService } from "../services/event";
import { getRsvpByEventId } from '../services/rsvp';

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

export const getEventById = async (req: Request, res: Response, next: Function) => {
  try {
    const { id } = req.params;

    const event = await getEventByIdService(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    // Fetch attendees for this event using the service
    const attendees = await getRsvpByEventId(id);
    res.status(200).json({ event, rsvp: attendees });
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
  getAllEvents,
  deleteEvent,
};

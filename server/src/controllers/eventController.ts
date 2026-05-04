import { Request, Response } from "express";
import { createEvent as createEventService, getEventById as getEventByIdService, getAllEvents as getAllEventsService, deleteEvent as deleteEventService, updateEvent as updateEventService } from "../services/event";
import { getRsvpByEventId } from '../services/rsvp';
import { getPollByEventId } from '../services/poll';

export const createEvent = async (req: Request, res: Response, next: Function) => {
  const { name, date, startTime, endTime, maxAttendees, location } = req.body;
  if (!name || !date || !location || !startTime || !endTime) {
    return res.status(400).json({ error: "Name, date, startTime, endTime, and location are required." });
  }
  if (endTime <= startTime) {
    return res.status(400).json({ error: "endTime must be after startTime." });
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
    const poll = getPollByEventId(id);
    res.status(200).json({ event, rsvp: attendees, poll });
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
  const { name, date, startTime, endTime, maxAttendees, location } = req.body;
  if (endTime && startTime && endTime <= startTime) {
    return res.status(400).json({ error: "endTime must be after startTime." });
  }
  try {
    const event = await updateEventService(id, { name, date, startTime, endTime, maxAttendees, location });
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
  getAllEvents,
  updateEvent,
  deleteEvent,
};

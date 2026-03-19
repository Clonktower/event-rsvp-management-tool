import { Request, Response } from 'express';
import { createPoll, closePoll, reopenPoll, updatePoll, deletePoll, castVotes } from '../services/poll';

export const createPollController = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: eventId } = req.params;
    const { title, options } = req.body;

    if (!title || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: 'Title and at least one option are required.' });
    }

    for (const opt of options) {
      if (!opt.name || !opt.url) {
        return res.status(400).json({ error: 'Each option must have a name and a url.' });
      }
    }

    const poll = createPoll(eventId, title, options);
    res.status(201).json({ poll });
  } catch (err) {
    next(err);
  }
};

export const closePollController = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: pollId } = req.params;
    const poll = closePoll(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found or already closed.' });
    }
    res.status(200).json({ poll });
  } catch (err) {
    next(err);
  }
};

export const reopenPollController = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: pollId } = req.params;
    const poll = reopenPoll(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found or already open.' });
    }
    res.status(200).json({ poll });
  } catch (err) {
    next(err);
  }
};

export const updatePollController = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: pollId } = req.params;
    const { title, options } = req.body;

    if (!title || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ error: 'Title and at least one option are required.' });
    }

    for (const opt of options) {
      if (!opt.name || !opt.url) {
        return res.status(400).json({ error: 'Each option must have a name and a url.' });
      }
    }

    const poll = updatePoll(pollId, title, options);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }
    res.status(200).json({ poll });
  } catch (err) {
    next(err);
  }
};

export const deletePollController = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: pollId } = req.params;
    const deleted = deletePoll(pollId);
    if (!deleted) {
      return res.status(404).json({ error: 'Poll not found.' });
    }
    res.status(200).json({ message: 'Poll deleted.' });
  } catch (err) {
    next(err);
  }
};

export const castVotesController = async (req: Request, res: Response, next: Function) => {
  try {
    const { id: pollId } = req.params;
    const { rsvpId, token, optionIds } = req.body;

    if (!rsvpId || !token || !Array.isArray(optionIds)) {
      return res.status(400).json({ error: 'rsvpId, token, and optionIds are required.' });
    }

    const poll = castVotes(pollId, rsvpId, token, optionIds);
    if (!poll) {
      return res.status(403).json({ error: 'Invalid token, poll not found, or invalid options.' });
    }
    res.status(200).json({ poll });
  } catch (err) {
    next(err);
  }
};

export const pollController = {
  createPollController,
  closePollController,
  reopenPollController,
  updatePollController,
  deletePollController,
  castVotesController,
};

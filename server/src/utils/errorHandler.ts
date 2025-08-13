import { Request, Response } from "express";

export const errorHandler = (err: any, req: Request, res: Response, next: Function) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
};


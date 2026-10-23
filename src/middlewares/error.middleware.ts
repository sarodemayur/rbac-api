import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  console.error(err);
  res.status(500).json({
    message: "Internal server error",
  });
};

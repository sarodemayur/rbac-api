import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../helpers/functions";
import { User } from "../models/user.model";

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const token = authorization.slice(7);
    const payload = jwt.verify(token, getJwtSecret());
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
    const user = await User.findById(payload.sub).select("_id role");
    if (!user) {
      res.status(404).json({ message: "User no longer exist" });
      return;
    }

    req.authUser = {
      id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }
    next(error);
  }
};

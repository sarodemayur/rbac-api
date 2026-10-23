import { RequestHandler } from "express";
import { Role } from "../models/user.model";

export const authorize = (...allowedRoles: Role[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.authUser) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({
        message: "You do not have permission to access this resource",
      });
      return;
    }
    next();
  };
};

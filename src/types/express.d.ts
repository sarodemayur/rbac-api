import type { Role } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: Role;
      };
    }
  }
}

export {};

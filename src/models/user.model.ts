import { model, Schema } from "mongoose";

export const ROLES = ["user", "manager", "admin"] as const;

export type Role = (typeof ROLES)[number];

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: "user",
      required: true,
    },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);

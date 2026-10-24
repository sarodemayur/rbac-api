import { Request, Response, NextFunction } from "express";
import z from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";
import { getJwtSecret } from "../helpers/functions";
import { createRefreshToken, hashRefreshToken } from "../utils/tokens";
import { RefreshToken } from "../models/refresh-token.model";
import { randomBytes } from "node:crypto";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: "Invalid registration data",
        errors: result.error.flatten(),
      });
      return;
    }

    const { email, password, name } = result.data;
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ message: "Invalid login data" });
      return;
    }

    const { email, password } = result.data;
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const accessToken = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      getJwtSecret(),
      {
        expiresIn: "1h",
      },
    );

    const refreshToken = await createRefreshToken(user._id.toString());

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileUrl: user.profileUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = refreshSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Refresh token is required",
      });
      return;
    }

    const oldHash = hashRefreshToken(result.data.refreshToken);

    const storedToken = await RefreshToken.findOne({
      tokenHash: oldHash,
    });

    if (!storedToken) {
      res.status(401).json({
        message: "Invalid refresh token",
      });
      return;
    }

    // Detect reuse of a token that was previously rotated.
    if (storedToken.revokedAt) {
      if (storedToken.replacedByTokenHash) {
        await RefreshToken.updateMany(
          {
            user: storedToken.user,
            revokedAt: null,
          },
          {
            $set: { revokedAt: new Date() },
          },
        );
      }

      res.status(401).json({
        message: "Refresh token is revoked",
      });
      return;
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      storedToken.revokedAt = new Date();
      await storedToken.save();

      res.status(401).json({
        message: "Refresh token has expired",
      });
      return;
    }

    const user = await User.findById(storedToken.user).select("_id");

    if (!user) {
      storedToken.revokedAt = new Date();
      await storedToken.save();

      res.status(401).json({
        message: "User no longer exists",
      });
      return;
    }

    // Generate the replacement token.
    const newRefreshToken = randomBytes(64).toString("hex");
    const newHash = hashRefreshToken(newRefreshToken);
    const now = new Date();

    // Atomically claim the old token so concurrent refresh
    // requests cannot both successfully rotate it.
    const claimedToken = await RefreshToken.findOneAndUpdate(
      {
        _id: storedToken._id,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          revokedAt: now,
          replacedByTokenHash: newHash,
        },
      },
      { new: true },
    );

    if (!claimedToken) {
      res.status(401).json({
        message: "Refresh token is no longer valid",
      });
      return;
    }

    await RefreshToken.create({
      user: user._id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: jwt.sign(
        { sub: user._id.toString(), role: user.role },
        getJwtSecret(),
        {
          expiresIn: "1h",
        },
      ),
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = refreshSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Refresh token is required",
      });
      return;
    }

    const tokenHash = hashRefreshToken(result.data.refreshToken);

    await RefreshToken.updateOne(
      {
        tokenHash,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      },
    );

    // Return the same response even if the token is already
    // revoked or unknown, making logout idempotent.
    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

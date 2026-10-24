import { createHash, randomBytes } from "node:crypto";
import { RefreshToken } from "../models/refresh-token.model";

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createRefreshToken(userId: string) {
  const token = randomBytes(64).toString("hex");
  const tokenHash = hashRefreshToken(token);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

import { StreamChat } from "stream-chat";
import type { Env } from "./env.js";
import type { UserRole } from "../db/schema.js";

export function streamChatDisplayName(
  role: UserRole,
  displayName: string | null,
  email: string,
): string {
  const base = displayName ?? email.split("@")[0];
  if (role === "admin") return `Admin · ${base}`;
  if (role === "support") return `Support · ${base}`;
  return base;
}

export function getStreamChatServer(env: Env) {
  if (!env.STREAM_API_KEY || !env.STREAM_API_SECRET) {
    throw new Error("STREAM_API_KEY and STREAM_API_SECRET must be set to use Stream Chat");
  }

  return StreamChat.getInstance(env.STREAM_API_KEY, env.STREAM_API_SECRET);
}

export function streamUserId(clerkUserId: string) {
  return `clerk_${clerkUserId}`;
}

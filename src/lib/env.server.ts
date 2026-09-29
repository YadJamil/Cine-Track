import "server-only";
import { z } from "zod";

// Media metadata comes from keyless providers (TVmaze + Cinemeta) — no API key.
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Web Push — optional so the app boots without it; push just stays off.
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  PUSH_DISPATCH_SECRET: z.string().optional(),
});

export const serverEnv = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  PUSH_DISPATCH_SECRET: process.env.PUSH_DISPATCH_SECRET,
});

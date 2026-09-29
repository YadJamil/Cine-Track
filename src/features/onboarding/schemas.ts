import { z } from "zod";

// [ASSUMPTION A7] age gate ≥ 16, minimum 3 shows
export const MIN_AGE = 16;
export const MIN_SHOWS = 3;
// Curated TVmaze show ids for the onboarding picker (verified real ids).
export const ONBOARDING_SEED_IDS = [
  169, // Breaking Bad
  82, // Game of Thrones
  2993, // Stranger Things
  526, // The Office
  431, // Friends
  83, // The Simpsons
  73, // The Walking Dead
  335, // Sherlock
  618, // Better Call Saul
  216, // Rick and Morty
  30770, // Chernobyl
  269, // Peaky Blinders
  1371, // Westworld
  305, // Black Mirror
  3594, // The Crown
  5, // True Detective
  32, // Fargo
  46562, // The Last of Us
  15299, // The Boys
  38963, // The Mandalorian
  17861, // Dark
  13417, // Ozark
  23470, // Succession
  44933, // Severance
  54198, // The Bear
  53647, // Wednesday
  44778, // House of the Dragon
  55138, // Arcane: League of Legends
  919, // Attack on Titan
  2705, // Narcos
  527, // The Sopranos
  179, // The Wire
  161, // Dexter
  123, // Lost
  66, // The Big Bang Theory
  171, // How I Met Your Mother
];
export const SUGGESTION_COUNT = ONBOARDING_SEED_IDS.length;

export const ageGateSchema = z.object({
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine((d) => !Number.isNaN(Date.parse(d)), "Enter a valid date"),
  marketingOptIn: z.boolean(),
});

export const identitySchema = z.object({
  username: z
    .string()
    .regex(
      /^[a-z0-9_]{3,20}$/,
      "3–20 characters: lowercase letters, numbers, underscores",
    ),
  displayName: z.string().trim().min(1, "Required").max(50),
});

export const completeOnboardingSchema = z.object({
  tmdbIds: z.array(z.number().int().positive()).min(MIN_SHOWS),
});

export function ageFromBirthday(birthday: string): number {
  const b = new Date(`${birthday}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const beforeBirthday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

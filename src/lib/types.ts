/** Server Actions never throw across the wire; they return a Result. */
export type Result<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T = undefined>(error: string): Result<T> {
  return { ok: false, error };
}

// Minimal RFC-4180 CSV parsing + normalization of a TV Time export into the
// shape the import server action consumes. Runs client-side (browser).

export type ImportWatch = {
  season: number;
  episode: number;
  watchedAt: string; // ISO
  runtimeSeconds: number | null;
  bulkType: "season" | "unitary";
};

export type ImportShow = {
  /**
   * TheTVDB id from the export. TV Time's display names carry disambiguators it
   * invents ("Euphoria (US)", "INVINCIBLE (2021)") that no provider matches, so
   * this id — present on every export row — is what actually resolves the show.
   */
  tvdbId: number | null;
  name: string;
  isFollowed: boolean;
  isFavorited: boolean;
  isForLater: boolean;
  isArchived: boolean;
  watches: ImportWatch[];
};

/** Parse CSV text into rows of string cells (handles quoted fields). */
export function parseCsv(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parse CSV text into header-keyed records. */
export function toRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text).filter((r) => r.some((c) => c !== ""));
  const header = rows[0];
  if (!header) return [];
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => {
      o[h] = r[i] ?? "";
    });
    return o;
  });
}

function toIso(tvTimeDate: string): string {
  // "2026-03-16 12:16:24" → ISO (treated as UTC)
  const d = new Date(tvTimeDate.trim().replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

const truthy = (v: string) => v === "1" || v.toLowerCase() === "true";

function toTvdbId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Merge the three relevant TV Time CSVs into one entry per show, keyed by its
 * TheTVDB id (falling back to name for rows that somehow lack one). Every
 * imported show is marked followed so it appears in the library.
 */
export function buildImportShows(files: {
  userTvShowData?: string;
  specialStatus?: string;
  tracking?: string;
}): ImportShow[] {
  const byKey = new Map<string, ImportShow>();
  const get = (rawName: string, rawId?: string): ImportShow | null => {
    const name = rawName.trim();
    const tvdbId = toTvdbId(rawId);
    if (!name && !tvdbId) return null;
    const key = tvdbId ? `tvdb:${tvdbId}` : `name:${name.toLowerCase()}`;
    let s = byKey.get(key);
    if (!s) {
      s = {
        tvdbId,
        name,
        isFollowed: true,
        isFavorited: false,
        isForLater: false,
        isArchived: false,
        watches: [],
      };
      byKey.set(key, s);
    }
    if (!s.name && name) s.name = name;
    return s;
  };

  for (const r of toRecords(files.userTvShowData ?? "")) {
    const s = get(r.tv_show_name ?? "", r.tv_show_id);
    if (!s) continue;
    s.isFollowed = s.isFollowed || truthy(r.is_followed ?? "");
    s.isFavorited = s.isFavorited || truthy(r.is_favorited ?? "");
  }

  for (const r of toRecords(files.specialStatus ?? "")) {
    const s = get(r.tv_show_name ?? "", r.tv_show_id);
    if (!s) continue;
    if (r.status === "for_later") s.isForLater = true;
    if (r.status === "archived") s.isArchived = true;
  }

  for (const r of toRecords(files.tracking ?? "")) {
    if (!r.key?.startsWith("watch-episode")) continue;
    const season = Number(r.season_number);
    const episode = Number(r.episode_number);
    if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 1) {
      continue;
    }
    const s = get(r.series_name ?? "", r.s_id);
    if (!s) continue;
    const runtime = Number(r.runtime);
    s.watches.push({
      season,
      episode,
      watchedAt: toIso(r.created_at ?? ""),
      runtimeSeconds: Number.isFinite(runtime) && runtime > 0 ? runtime : null,
      bulkType: r.bulk_type === "season" ? "season" : "unitary",
    });
  }

  // A row missing its id would otherwise import the same show a second time —
  // fold those into the id-keyed entry with the same name.
  const byName = new Map<string, ImportShow>();
  for (const s of byKey.values()) {
    if (s.tvdbId) byName.set(s.name.toLowerCase(), s);
  }
  for (const [key, s] of byKey) {
    if (s.tvdbId) continue;
    const twin = byName.get(s.name.toLowerCase());
    if (!twin) continue;
    twin.isFollowed ||= s.isFollowed;
    twin.isFavorited ||= s.isFavorited;
    twin.isForLater ||= s.isForLater;
    twin.isArchived ||= s.isArchived;
    twin.watches.push(...s.watches);
    byKey.delete(key);
  }

  return [...byKey.values()];
}

/** Locate a file inside the zip's entries by name suffix (ignores folders). */
export function matchFile(
  names: string[],
  suffix: string,
): string | undefined {
  return names.find((n) => n.toLowerCase().endsWith(suffix.toLowerCase()));
}

"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";
import { FileArchive, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  buildImportShows,
  matchFile,
} from "@/features/import/csv";
import {
  finalizeImport,
  importTvTimeShows,
  type ImportSummary,
} from "@/features/import/actions";

const BATCH = 5;

export function TvTimeImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please choose a .zip file exported from TV Time.");
      return;
    }
    setBusy(true);
    setSummary(null);
    setProgress(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const names = Object.keys(zip.files);
      const read = async (suffix: string) => {
        const n = matchFile(names, suffix);
        const entry = n ? zip.files[n] : undefined;
        return entry ? await entry.async("string") : undefined;
      };
      const [userTvShowData, specialStatus, tracking] = await Promise.all([
        read("user_tv_show_data.csv"),
        read("user_show_special_status.csv"),
        read("tracking-prod-records-v2.csv"),
      ]);
      if (!userTvShowData && !tracking) {
        toast.error("Couldn't find TV Time data in that .zip.");
        return;
      }

      const shows = buildImportShows({ userTvShowData, specialStatus, tracking });
      if (shows.length === 0) {
        toast.error("No shows found in the export.");
        return;
      }

      setProgress({ done: 0, total: shows.length });
      const agg: ImportSummary = { imported: [], skipped: [] };
      for (let i = 0; i < shows.length; i += BATCH) {
        const res = await importTvTimeShows({ shows: shows.slice(i, i + BATCH) });
        if (!res.ok) {
          toast.error(res.error);
          break;
        }
        agg.imported.push(...res.data.imported);
        agg.skipped.push(...res.data.skipped);
        setProgress({ done: Math.min(i + BATCH, shows.length), total: shows.length });
      }
      await finalizeImport();
      setSummary(agg);
      const eps = agg.imported.reduce((n, s) => n + s.watches, 0);
      toast.success(`Imported ${agg.imported.length} shows, ${eps} episode watches.`);
    } catch {
      toast.error("Import failed — check the file and try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const pct = progress ? (progress.done / progress.total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileArchive className="size-5" aria-hidden /> Import from TV Time
        </CardTitle>
        <CardDescription>
          Upload your TV Time data export (.zip). We import your shows, follow
          states and episode watch history. Movies aren&apos;t included.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          // Android Chrome's file picker can fall back to a Photos-only
          // chooser (no "Files"/"Downloads" option) when the accept list is
          // too narrow to resolve a document-provider app — widening the MIME
          // set to cover the common zip variants fixes that; the actual
          // extension is re-checked in handleFile.
          accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream,multipart/x-zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleFile(f);
          }}
        />
        <div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden />
            ) : (
              <Upload data-icon="inline-start" aria-hidden />
            )}
            Choose .zip
          </Button>
        </div>

        {progress ? (
          <div className="flex flex-col gap-1.5">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              Importing… {progress.done}/{progress.total} shows
            </p>
          </div>
        ) : null}

        {summary ? (
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">
              Imported {summary.imported.length} show
              {summary.imported.length === 1 ? "" : "s"} (
              {summary.imported.reduce((n, s) => n + s.watches, 0)} episode
              watches).
            </p>
            {summary.skipped.length > 0 ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground">
                  {summary.skipped.length} skipped
                </summary>
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {summary.skipped.slice(0, 50).map((s) => (
                    <li key={s.name}>
                      {s.name} — {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Download, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { relativeTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import {
  getExportDownloadUrl,
  requestDataExport,
} from "@/features/gdpr/actions";

const STATUS_VARIANT: Record<
  Tables<"data_export_requests">["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  processing: "secondary",
  done: "default",
  error: "destructive",
};

export function DataRequests({
  requests,
}: {
  requests: Tables<"data_export_requests">[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function request() {
    startTransition(async () => {
      const res = await requestDataExport();
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Export ready — download it below.");
        router.refresh();
      }
    });
  }

  function download(id: string) {
    startTransition(async () => {
      const res = await getExportDownloadUrl(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.open(res.data, "_blank", "noopener");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>
          Download everything CineTrack stores about you as a ZIP of JSON files —
          profile, watches, comments, follows and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button onClick={request} disabled={pending} className="self-start">
          <FileArchive data-icon="inline-start" aria-hidden />
          {pending ? "Preparing…" : "Request data export"}
        </Button>

        {requests.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-lg border p-2.5 text-sm"
              >
                <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                  {r.status}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  Requested {relativeTime(r.created_at)}
                  {r.error_message ? ` · ${r.error_message}` : ""}
                </span>
                {r.status === "done" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => download(r.id)}
                    disabled={pending}
                  >
                    <Download data-icon="inline-start" aria-hidden /> Download
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

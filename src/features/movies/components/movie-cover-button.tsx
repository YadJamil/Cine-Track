"use client";

import { useTransition } from "react";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { setCoverFromMovie } from "@/features/profile/actions";

/** Sets the viewer's profile cover to this movie's wide backdrop. */
export function MovieCoverButton({
  movieId,
  movieSourceId,
  signedIn,
}: {
  movieId: number;
  movieSourceId: string;
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!signedIn) return toast.error("Log in to set a cover.");
    startTransition(async () => {
      const res = await setCoverFromMovie({ movieId, movieSourceId });
      if (!res.ok) toast.error(res.error);
      else toast.success("Profile cover updated");
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-sm"
            variant="outline"
            onClick={onClick}
            disabled={pending}
            aria-label="Use artwork as profile cover"
          >
            <ImageIcon aria-hidden />
          </Button>
        }
      />
      <TooltipContent>Set as profile cover</TooltipContent>
    </Tooltip>
  );
}

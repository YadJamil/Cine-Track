"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Result } from "@/lib/types";

/** Flip instantly, roll back on failure. */
export function useOptimisticToggle(
  initial: boolean,
  action: (next: boolean) => Promise<Result<unknown>>,
) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => setValue(initial), [initial]);

  function toggle() {
    const next = !value;
    setValue(next);
    startTransition(async () => {
      const res = await action(next);
      if (!res.ok) {
        setValue(!next);
        toast.error(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return { value, pending, toggle };
}

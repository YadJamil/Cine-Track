"use client";

import { useState } from "react";
import { Accordion } from "@/components/ui/accordion";

/**
 * Controlled season accordion. The show page (a Server Component) re-renders on
 * router.refresh() after marking episodes watched, which changes the derived
 * "open the in-progress season" default — an uncontrolled accordion warns when
 * its defaultValue changes post-mount. Seed the open state once and own it here;
 * key by show id so navigating to another show resets to that show's default.
 */
export function SeasonAccordion({
  initialValue,
  children,
}: {
  initialValue: string[];
  children: React.ReactNode;
}) {
  const [value, setValue] = useState<string[]>(initialValue);
  return (
    <Accordion
      multiple={false}
      value={value}
      onValueChange={(next) => setValue(next as string[])}
    >
      {children}
    </Accordion>
  );
}

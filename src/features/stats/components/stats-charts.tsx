"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SeriesPoint = { label: string; count: number; hours: number };

const countConfig = {
  count: { label: "Watched", color: "var(--chart-1)" },
} satisfies ChartConfig;

const hoursConfig = {
  hours: { label: "Hours", color: "var(--chart-2)" },
} satisfies ChartConfig;

function SeriesChart({
  data,
  metric,
  title,
}: {
  data: SeriesPoint[];
  metric: "count" | "hours";
  title: string;
}) {
  const config = metric === "count" ? countConfig : hoursConfig;
  return (
    <div className="rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <ChartContainer config={config} className="h-48 w-full">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tickFormatter={(v: string) => v.slice(-2)}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey={metric}
            fill={`var(--color-${metric})`}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function StatsCharts({
  show,
  movie,
}: {
  show: { monthly: SeriesPoint[]; weekly: SeriesPoint[] };
  movie: { monthly: SeriesPoint[]; weekly: SeriesPoint[] };
}) {
  const [media, setMedia] = useState<"show" | "movie">("show");
  const active = media === "show" ? show : movie;
  const noun = media === "show" ? "Episodes" : "Movies";

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={media}
        onValueChange={(v) => setMedia(v === "movie" ? "movie" : "show")}
      >
        <TabsList>
          <TabsTrigger value="show">Episodes</TabsTrigger>
          <TabsTrigger value="movie">Movies</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid gap-4 lg:grid-cols-2">
        <SeriesChart
          data={active.monthly}
          metric="count"
          title={`${noun} watched · last 12 months`}
        />
        <SeriesChart
          data={active.weekly}
          metric="count"
          title={`${noun} watched · last 12 weeks`}
        />
        <SeriesChart
          data={active.monthly}
          metric="hours"
          title="Hours watched · last 12 months"
        />
        <SeriesChart
          data={active.weekly}
          metric="hours"
          title="Hours watched · last 12 weeks"
        />
      </div>
    </div>
  );
}

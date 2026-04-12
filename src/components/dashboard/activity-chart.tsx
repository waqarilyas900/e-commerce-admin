import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer } from "@/components/dashboard/chart-container";

/** Illustrative storefront sessions (replace with live analytics when available). */
const data = Array.from({ length: 24 }, (_, i) => {
  const d = new Date();
  d.setHours(d.getHours() - (23 - i));
  return {
    t: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    sessions: Math.round(120 + Math.random() * 280 + i * 12),
  };
});

export function ActivityChart() {
  return (
    <Card className="min-h-[320px]">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Illustrative session trend (last 24 hours)</CardDescription>
      </CardHeader>
      <CardContent className="w-full min-w-0 overflow-hidden pl-0">
        <ChartContainer>
          {({ width, height }) => (
            <AreaChart
              width={width}
              height={height}
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillReq" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="t"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                }}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Sessions"
                stroke="hsl(var(--primary))"
                fill="url(#fillReq)"
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

import {
  Bar,
  BarChart,
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

const categories = [
  { name: "Accessories", count: 420 },
  { name: "Peripherals", count: 310 },
  { name: "Displays", count: 280 },
  { name: "Audio", count: 190 },
  { name: "Other", count: 95 },
];

export function DistributionChart() {
  return (
    <Card className="min-h-[320px]">
      <CardHeader>
        <CardTitle>Distribution</CardTitle>
        <CardDescription>Illustrative mix by product type (preview)</CardDescription>
      </CardHeader>
      <CardContent className="w-full min-w-0 overflow-hidden pl-0">
        <ChartContainer>
          {({ width, height }) => (
            <BarChart
              width={width}
              height={height}
              data={categories}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-12}
                textAnchor="end"
                height={56}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                width={36}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
                name="Units"
              />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ScoreBucket } from "../lib/analytics";
import styles from "./ScoreTrendChart.module.css";

interface ScoreTrendChartProps {
  data: ScoreBucket[];
  formatX?: (ms: number) => string;
}

function defaultFormat(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Line chart of the average posture score over the selected period.
export default function ScoreTrendChart({ data, formatX = defaultFormat }: ScoreTrendChartProps) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Score trend</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="bucketStart"
            tickFormatter={formatX}
            tick={{ fontSize: 10, fill: "#8a8a8a" }}
            tickLine={false}
            axisLine={{ stroke: "#ebebeb" }}
            minTickGap={40}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#8a8a8a" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            labelFormatter={(v) => formatX(Number(v))}
            formatter={(v: number) => [`${v}`, "Score"]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #ebebeb",
              fontFamily: "ui-monospace, monospace",
            }}
          />
          <Line type="monotone" dataKey="averageScore" stroke="#d71921" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

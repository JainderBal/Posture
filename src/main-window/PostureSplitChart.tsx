import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { PostureSplit } from "../lib/analytics";
import styles from "./PostureSplitChart.module.css";

interface PostureSplitChartProps {
  split: PostureSplit;
}

// Donut of good vs bad posture time, with the good percentage in the center.
export default function PostureSplitChart({ split }: PostureSplitChartProps) {
  const data = [
    { name: "Good", value: split.good, color: "#16a34a" },
    { name: "Bad", value: split.bad, color: "#d71921" },
  ];

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Good posture</h2>
      <div className={styles.row}>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={42}
                outerRadius={58}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {data.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <span className={styles.percent}>{Math.round(split.goodPct)}%</span>
        </div>
        <ul className={styles.legend}>
          <li>
            <span className={`${styles.dot} ${styles.good}`} /> Good · {split.good}
          </li>
          <li>
            <span className={`${styles.dot} ${styles.bad}`} /> Bad · {split.bad}
          </li>
        </ul>
      </div>
    </section>
  );
}

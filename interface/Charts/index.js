import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useTheme } from "@primer/react";
import classes from "./index.module.css";

export function BarChart({
  title,
  data,
  yDataKey,
  name,
  fill = "#2da44e",
  xDataKey = "date",
}) {
  const { theme } = useTheme();
  const background = theme?.colors?.canvas?.default || "#ffffff";

  return (
    <div>
      <h2>{title}</h2>
      <div className={classes.ChartArea}>
        <ResponsiveContainer width="100%" height={140}>
          <RechartsBarChart data={data}>
            <XAxis dataKey={xDataKey} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: background }} />
            <Bar dataKey={yDataKey} name={name || yDataKey} fill={fill} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CategoryBreakdownItem } from "@/lib/supabase/reporting";

type Props = {
  data: CategoryBreakdownItem[];
};

export function PersonalCategoryChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-600">
        No appointment categories logged this month yet.
      </p>
    );
  }

  return (
    <div className="h-64 md:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="category_name"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={56}
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="total_count" fill="#0D9488" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface FinancialDataPoint {
  period: string;
  revenue: number;
  netIncome: number;
  grossProfit: number;
}

export function FinancialCharts({
  data,
  locale,
}: {
  data: FinancialDataPoint[];
  locale: string;
}) {
  const isAr = locale === "ar";

  return (
    <div className="space-y-6">
      {/* Revenue & Net Income Chart */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          {isAr ? "الإيرادات وصافي الدخل (مليون ر.س)" : "Revenue & Net Income (M SAR)"}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip
              formatter={(value) =>
                `${Number(value).toLocaleString(isAr ? "ar-SA" : "en-SA")} M`
              }
            />
            <Legend />
            <Bar
              dataKey="revenue"
              fill="#10b981"
              name={isAr ? "الإيرادات" : "Revenue"}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="netIncome"
              fill="#6366f1"
              name={isAr ? "صافي الدخل" : "Net Income"}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gross Profit Chart */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          {isAr ? "إجمالي الربح (مليون ر.س)" : "Gross Profit (M SAR)"}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip
              formatter={(value) =>
                `${Number(value).toLocaleString(isAr ? "ar-SA" : "en-SA")} M`
              }
            />
            <Bar
              dataKey="grossProfit"
              fill="#f59e0b"
              name={isAr ? "إجمالي الربح" : "Gross Profit"}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

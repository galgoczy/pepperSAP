import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { formatCurrency } from '../../lib/utils';

// Pepper House colors
const PEPPER_RED = '#D32F2F';
const PEPPER_GREEN = '#22c55e';
const PEPPER_GRAY = '#9ca3af';

// Minimal trend chart for dashboard (no numbers, just visual)
export function MiniTrendChart({ data, height = 80 }) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PEPPER_RED} stopOpacity={0.3} />
            <stop offset="95%" stopColor={PEPPER_RED} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={PEPPER_RED}
          strokeWidth={2}
          fill="url(#colorRevenue)"
          isAnimationActive={true}
          animationDuration={1000}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white px-2 py-1 shadow rounded text-xs">
                  <p className="text-gray-600">{payload[0].payload.label}</p>
                  <p className="font-bold text-pepper-red">
                    {formatCurrency(payload[0].value)}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Day-over-day change bar chart
export function DayOverDayChart({ data, height = 200 }) {
  if (!data || data.length < 2) return null;

  // Calculate day-over-day changes
  const chartData = data.map((item, index) => {
    if (index === 0) {
      return { ...item, change: 0, changePercent: 0 };
    }
    const prevValue = data[index - 1].value || 0;
    const change = item.value - prevValue;
    const changePercent = prevValue > 0 ? ((change / prevValue) * 100) : 0;
    return { ...item, change, changePercent };
  }).slice(1); // Skip first day as it has no previous

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Napi változás</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value >= 0 ? '+' : ''}${Math.round(value / 1000)}k`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const isPositive = data.change >= 0;
                return (
                  <div className="bg-white px-3 py-2 shadow-lg rounded border text-sm">
                    <p className="text-gray-600 font-medium">{data.label}</p>
                    <p className="text-gray-800">Forgalom: {formatCurrency(data.value)}</p>
                    <p className={isPositive ? 'text-green-600' : 'text-red-600'}>
                      Változás: {isPositive ? '+' : ''}{formatCurrency(data.change)}
                      <span className="text-xs ml-1">
                        ({isPositive ? '+' : ''}{data.changePercent.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="change" radius={[4, 4, 0, 0]} isAnimationActive={true}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.change >= 0 ? PEPPER_GREEN : PEPPER_RED}
                opacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Full revenue trend chart with more details
export function RevenueTrendChart({ data, height = 250, showAxis = true }) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: showAxis ? 50 : 10, bottom: 10 }}>
        <defs>
          <linearGradient id="colorRevenueFull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PEPPER_RED} stopOpacity={0.2} />
            <stop offset="95%" stopColor={PEPPER_RED} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxis && (
          <>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            />
          </>
        )}
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white px-3 py-2 shadow-lg rounded border text-sm">
                  <p className="text-gray-600">{payload[0].payload.label}</p>
                  <p className="font-bold text-pepper-red">
                    {formatCurrency(payload[0].value)}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={PEPPER_RED}
          strokeWidth={2}
          fill="url(#colorRevenueFull)"
          isAnimationActive={true}
          animationDuration={1000}
          dot={{ fill: PEPPER_RED, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: PEPPER_RED }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

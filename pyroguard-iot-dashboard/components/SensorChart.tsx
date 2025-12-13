import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { SensorData, Thresholds } from '../types';

interface SensorChartProps {
  data: SensorData[];
  dataKey: keyof SensorData;
  color: string;
  threshold: number;
  label: string;
  unit: string;
}

export const SensorChart: React.FC<SensorChartProps> = ({
  data,
  dataKey,
  color,
  threshold,
  label,
  unit
}) => {
  return (
    <div className="h-48 w-full bg-slate-800 rounded-lg p-2 shadow-inner border border-slate-700">
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h3>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="timestamp" 
            hide={true} 
            type="number" 
            domain={['dataMin', 'dataMax']} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            domain={['auto', 'auto']}
            width={30}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
            itemStyle={{ color: color }}
            labelFormatter={() => ''}
            formatter={(value: number) => [`${value.toFixed(1)} ${unit}`, label]}
          />
          <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false} // Performance for realtime
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
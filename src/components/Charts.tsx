// src/components/Charts.tsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface LineChartProps {
  data: { [key: string]: any }[];
  xKey: string;
  yKey: string;
  title: string;
  height: number;
}

export const LineChart: React.FC<LineChartProps> = ({ data, xKey, yKey, title, height }) => {
  const chartData = {
    labels: data.map((d) => d[xKey]),
    datasets: [
      {
        label: title,
        data: data.map((d) => d[yKey]),
        borderColor: '#9333ea',
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        fill: true,
      },
    ],
  };

  return (
    <div style={{ height }}>
      <Line
        data={chartData}
        options={{
          responsive: true,
          plugins: { legend: { position: 'top' }, title: { display: true, text: title } },
        }}
      />
    </div>
  );
};
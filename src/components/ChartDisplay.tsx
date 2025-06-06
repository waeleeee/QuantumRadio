import React from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

interface ChartDisplayProps {
  data: any;
  options: any;
  chartType: 'bar' | 'line' | 'pie';
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({ data, options, chartType }) => {
  const ChartComponent = chartType === 'bar' ? Bar : chartType === 'line' ? Line : Pie;
  return <ChartComponent data={data} options={options} />;
};

export default ChartDisplay;
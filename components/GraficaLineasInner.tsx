'use client'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface Props {
  datos: { fecha: string; carga: number; real: number }[]
}

export default function GraficaLineasInner({ datos }: Props) {
  const labels = datos.map(d => {
    const parts = d.fecha.split('-')
    return `${parts[2]}/${parts[1]}`
  })

  const data = {
    labels,
    datasets: [
      {
        label: 'Carga',
        data: datos.map(d => d.carga),
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Medición Real',
        data: datos.map(d => d.real),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 12 },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) =>
            `${ctx.dataset.label ?? ''}: ${(ctx.parsed.y ?? 0).toLocaleString('es-GT', { maximumFractionDigits: 1 })} L`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: { size: 11 },
          callback: (v: number | string) => `${Number(v).toLocaleString('es-GT')} L`,
        },
      },
    },
  }

  if (!datos.length) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Sin datos para mostrar
      </div>
    )
  }

  return <Line data={data} options={options} />
}

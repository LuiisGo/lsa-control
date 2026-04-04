'use client'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Props {
  datos: { fecha: string; carga: number; real: number }[]
}

export default function GraficaBarrasInner({ datos }: Props) {
  const labels = datos.map(d => {
    const parts = d.fecha.split('-')
    return `${parts[2]}/${parts[1]}`
  })

  const data = {
    labels,
    datasets: [
      {
        label: 'Recepcionado',
        data: datos.map(d => d.carga),
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Medición',
        data: datos.map(d => d.real),
        backgroundColor: 'rgba(22, 163, 74, 0.8)',
        borderRadius: 4,
        borderSkipped: false,
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
          label: (ctx: TooltipItem<'bar'>) =>
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

  return <Bar data={data} options={options} />
}

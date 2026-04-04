'use client'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
  '#14b8a6', '#a855f7', '#d946ef', '#64748b',
]

export interface DatoProveedor {
  proveedor: string
  t1: number
  t2: number
  total: number
}

interface Props {
  datos: DatoProveedor[]
  campo: 't1' | 't2' | 'total'
}

export default function GraficaDonutInner({ datos, campo }: Props) {
  const items = datos.filter(d => d[campo] > 0)
  const sum = items.reduce((s, d) => s + d[campo], 0)

  if (!items.length || sum === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Sin datos para mostrar
      </div>
    )
  }

  const chartData = {
    labels: items.map(d => d.proveedor),
    datasets: [{
      data: items.map(d => d[campo]),
      backgroundColor: PALETTE.slice(0, items.length),
      borderWidth: 2,
      borderColor: '#f8fafc',
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { size: 11 },
          padding: 14,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          generateLabels: (chart: ChartJS) => {
            const ds = chart.data.datasets[0]
            return (chart.data.labels as string[]).map((label, i) => {
              const val = ds.data[i] as number
              const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : '0.0'
              return {
                text: `${label}  —  ${val.toLocaleString('es-GT', { maximumFractionDigits: 1 })} L  (${pct}%)`,
                fillStyle: (ds.backgroundColor as string[])[i],
                strokeStyle: (ds.backgroundColor as string[])[i],
                hidden: false,
                index: i,
                lineWidth: 0,
              }
            })
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.parsed as number
            const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : '0.0'
            return ` ${val.toLocaleString('es-GT', { maximumFractionDigits: 1 })} L (${pct}%)`
          },
        },
      },
    },
  }

  return <Doughnut data={chartData} options={options} />
}

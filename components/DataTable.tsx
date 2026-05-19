import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'
import type React from 'react'

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  className?: string
  cellClassName?: string
  render: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T, index: number) => string
  emptyMessage: string
  emptyTitle?: string
  loading?: boolean
  loadingRows?: number
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage,
  emptyTitle,
  loading = false,
  loadingRows = 3,
}: DataTableProps<T>) {
  if (loading) return <LoadingState rows={loadingRows} />

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className="table-wrapper">
      <table className="data-table min-w-full">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={getRowKey(row, index)}>
              {columns.map(column => (
                <td key={column.key} className={column.cellClassName}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

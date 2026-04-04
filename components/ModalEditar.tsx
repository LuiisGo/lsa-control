'use client'
import { useState, useEffect } from 'react'
import { X, Loader2, Save } from 'lucide-react'

export interface EditField {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: { value: string; label: string }[]
  min?: number
  step?: number
  required?: boolean
}

interface Props {
  open: boolean
  title: string
  fields: EditField[]
  initialValues: Record<string, string | number>
  onSave: (values: Record<string, string | number>) => Promise<void>
  onCancel: () => void
}

export function ModalEditar({ open, title, fields, initialValues, onSave, onCancel }: Props) {
  const [values, setValues] = useState<Record<string, string | number>>(initialValues)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues, open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(values)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm p-6">
        <button onClick={onCancel} className="absolute right-4 top-4 btn-icon btn-ghost" aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-base font-semibold text-slate-800 mb-5">{title}</h2>

        <div className="space-y-4">
          {fields.map(field => (
            <div key={field.key}>
              <label htmlFor={field.key} className="label">
                {field.label}{field.required && <span className="text-danger-500 ml-0.5">*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  id={field.key}
                  value={values[field.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  className="input"
                >
                  {field.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.key}
                  type={field.type}
                  min={field.min}
                  step={field.step}
                  value={values[field.key] ?? ''}
                  onChange={e => setValues(v => ({
                    ...v,
                    [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                  }))}
                  className="input"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary flex-1" disabled={saving}>
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : <><Save className="w-4 h-4" />Guardar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

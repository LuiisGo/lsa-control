'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Loader2, Users, ToggleLeft, ToggleRight, Fingerprint, Eye, EyeOff, X, AlertCircle, Trash2 } from 'lucide-react'
import { apiCall } from '@/lib/api'
import { webAuthnRegister, isWebAuthnAvailable } from '@/lib/webauthn'
import { ModalConfirmar } from '@/components/ModalConfirmar'
import toast from 'react-hot-toast'

const ALL_PERMISOS = [
  { key: 'cargas',     label: 'Registrar cargas de leche' },
  { key: 'medicion',   label: 'Registrar medición con regla' },
  { key: 'envios',     label: 'Registrar envíos' },
  { key: 'gastos',     label: 'Registrar gastos operativos' },
  { key: 'remanentes', label: 'Registrar remanentes' },
] as const

interface Usuario {
  id: string
  nombre: string
  username: string
  role: 'admin' | 'empleado'
  activo: boolean
  permisos?: string[]
}

export default function UsuariosPage() {
  const { data: session } = useSession()
  const token = (session?.user as { apiToken?: string })?.apiToken

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [registering, setRegistering] = useState<string | null>(null)
  const [webAuthnAvail, setWebAuthnAvail] = useState(false)
  const [deleteUsuario, setDeleteUsuario] = useState<Usuario | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({ nombre: '', username: '', role: 'empleado', password: '' })
  const [permisos, setPermisos] = useState<string[]>(['cargas','medicion','envios','gastos','remanentes'])
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    isWebAuthnAvailable().then(setWebAuthnAvail)
    load()
  }, [token])

  async function load() {
    if (!token) return
    const res = await apiCall<Usuario[]>('getUsuarios', {}, token)
    if (res.success && res.data) setUsuarios(res.data)
    setLoading(false)
  }

  async function handleToggle(u: Usuario) {
    setToggling(u.id)
    try {
      const res = await apiCall('toggleUsuario', { id: u.id }, token)
      if (res.success) { toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado'); load() }
      else toast.error(res.error ?? 'Error')
    } finally { setToggling(null) }
  }

  async function handleDelete() {
    if (!deleteUsuario || !token) return
    setDeleting(true)
    try {
      const res = await apiCall('deleteUsuario', { id: deleteUsuario.id }, token)
      if (res.success) { toast.success('Usuario eliminado'); setDeleteUsuario(null); load() }
      else toast.error(res.error ?? 'Error al eliminar')
    } finally { setDeleting(false) }
  }

  async function handleRegisterBiometric(u: Usuario) {
    setRegistering(u.id)
    try {
      const ok = await webAuthnRegister(u.id, u.nombre, u.username)
      if (ok) toast.success(`Biométrico registrado para ${u.nombre}`)
      else toast.error('No se pudo registrar el biométrico')
    } finally { setRegistering(null) }
  }

  function validateForm(): boolean {
    const errs: Record<string, string> = {}
    if (!form.nombre.trim()) errs.nombre = 'Requerido'
    if (!form.username.trim()) errs.username = 'Requerido'
    if (!form.password || form.password.length < 6) errs.password = 'Mínimo 6 caracteres'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    try {
      const res = await apiCall('saveUsuario', {
        ...form,
        permisos: form.role === 'empleado' ? permisos : undefined,
      }, token)
      if (res.success) {
        toast.success('Usuario creado')
        setShowModal(false)
        setForm({ nombre: '', username: '', role: 'empleado', password: '' })
        setPermisos(['cargas','medicion','envios','gastos','remanentes'])
        load()
      } else {
        toast.error(res.error ?? 'Error al crear usuario')
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de accesos al sistema</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Table */}
      <div className="card p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full" />)}
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-slate-400">
            <Users className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-none rounded-xl">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium text-slate-800">{u.nombre}</td>
                    <td className="text-slate-500 text-xs font-mono">{u.username}</td>
                    <td>
                      <span className={u.role === 'admin' ? 'badge-primary' : 'badge-slate'}>
                        {u.role}
                      </span>
                      {u.role === 'empleado' && u.permisos && u.permisos.length < 5 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.permisos.map(p => (
                            <span key={p} className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{p}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={u.activo ? 'badge-success' : 'badge-danger'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggle(u)}
                          disabled={toggling === u.id}
                          className="btn-ghost btn-icon"
                          title={u.activo ? 'Desactivar' : 'Activar'}
                          aria-label={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {toggling === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : u.activo ? (
                            <ToggleRight className="w-5 h-5 text-success-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        {webAuthnAvail && (
                          <button
                            onClick={() => handleRegisterBiometric(u)}
                            disabled={registering === u.id}
                            className="btn-ghost btn-icon"
                            title="Registrar biométrico"
                            aria-label="Registrar biométrico"
                          >
                            {registering === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Fingerprint className="w-4 h-4 text-primary-500" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteUsuario(u)}
                          className="btn-ghost btn-icon hover:bg-danger-50"
                          title="Eliminar usuario"
                          aria-label="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4 text-danger-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm p-6">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 btn-icon btn-ghost" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-slate-800 mb-5">Nuevo usuario</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="label label-required">Nombre completo</label>
                <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className={`input ${formErrors.nombre ? 'input-error' : ''}`} disabled={saving} placeholder="Ej: Juan Pérez" />
                {formErrors.nombre && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{formErrors.nombre}</p>}
              </div>
              <div>
                <label className="label label-required">Usuario</label>
                <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className={`input ${formErrors.username ? 'input-error' : ''}`} disabled={saving} placeholder="Ej: Juan01" />
                {formErrors.username && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{formErrors.username}</p>}
              </div>
              <div>
                <label className="label">Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input" disabled={saving}>
                  <option value="empleado">Empleado</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {form.role === 'empleado' && (
                <div>
                  <label className="label">Permisos de acceso</label>
                  <div className="space-y-2 mt-1">
                    {ALL_PERMISOS.map(p => (
                      <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded"
                          checked={permisos.includes(p.key)}
                          onChange={e => {
                            if (e.target.checked) setPermisos(prev => [...prev, p.key])
                            else setPermisos(prev => prev.filter(x => x !== p.key))
                          }}
                          disabled={saving}
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="label label-required">Contraseña</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`input pr-10 ${formErrors.password ? 'input-error' : ''}`} disabled={saving} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="error-msg"><AlertCircle className="w-3.5 h-3.5" />{formErrors.password}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1" disabled={saving}>Cancelar</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</> : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ModalConfirmar
        open={!!deleteUsuario}
        title="Eliminar usuario"
        message={`¿Eliminar al usuario "${deleteUsuario?.nombre}" (${deleteUsuario?.username})? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteUsuario(null)}
        loading={deleting}
      />
    </div>
  )
}

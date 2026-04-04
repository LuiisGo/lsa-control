'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { isWebAuthnAvailable, webAuthnAuthenticate } from '@/lib/webauthn'
import { LogoSA } from '@/components/LogoSA'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [webAuthnSupported, setWebAuthnSupported] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    isWebAuthnAvailable().then(setWebAuthnSupported)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      setError('Ingresá tu usuario y contraseña')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Usuario o contraseña incorrectos')
      } else if (result?.ok) {
        const res = await fetch('/api/auth/session')
        const session = await res.json()
        const role = session?.user?.role
        router.replace(role === 'admin' ? '/admin' : '/empleado')
        router.refresh()
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometric() {
    setBiometricLoading(true)
    setError('')
    try {
      const data = await webAuthnAuthenticate()
      if (!data) {
        setError('Autenticación biométrica fallida')
        return
      }

      const result = await signIn('credentials', {
        username: data.email,
        password: `webauthn:${data.token}`,
        redirect: false,
      })

      if (result?.ok) {
        router.replace(data.role === 'admin' ? '/admin' : '/empleado')
        router.refresh()
      } else {
        setError('No se pudo iniciar sesión biométrica')
      }
    } catch {
      setError('Error al usar biometría. Usá tu contraseña.')
    } finally {
      setBiometricLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-4">
      <div className="w-full max-w-sm flex flex-col items-center">

        {/* ── Logo del sello ─────────────────────────────── */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <LogoSA size={140} variant="dark" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-wide">Control LSA</h1>
            <p className="text-primary-300 text-xs mt-0.5 tracking-wider uppercase">
              Sistema de entradas y salidas
            </p>
          </div>
        </div>

        {/* ── Card de login ──────────────────────────────── */}
        <div className="w-full bg-white rounded-2xl p-6 shadow-modal">
          <h2 className="text-base font-semibold text-slate-700 mb-5 text-center">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div>
              <label htmlFor="username" className="label">Usuario</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                className={`input ${error ? 'input-error' : ''}`}
                placeholder="Ej: AdminLSA"
                disabled={loading}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className={`input pr-12 ${error ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2.5 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-3.5 mt-1"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</>
              ) : 'Ingresar'}
            </button>
          </form>

          {/* Biométrico */}
          {webAuthnSupported && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400">o continuar con</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBiometric}
                disabled={biometricLoading}
                className="btn-secondary w-full gap-2"
              >
                {biometricLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  /* Fingerprint icon */
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 10a2 2 0 0 0-2 2v4" />
                    <path d="M10 10a2 2 0 0 1 4 0c0 4-1 7-2 8" />
                    <path d="M8.5 8.5A5 5 0 0 1 17 12c0 4.5-1.5 7-3 9" />
                    <path d="M6 9a7 7 0 0 1 12.22-1" />
                    <path d="M4.5 10.5A9.5 9.5 0 0 1 21 12c0 5-2 9-4 11" />
                    <path d="M2 13a12 12 0 0 1 3.5-7.5" />
                  </svg>
                )}
                Face ID / Huella digital
              </button>
            </>
          )}
        </div>

        {/* ── Footer POWERED BY FUTURA ───────────────────── */}
        <div className="mt-8 flex flex-col items-center gap-1">
          <p className="text-primary-400 text-[10px] uppercase tracking-[3px] font-medium">
            Powered by
          </p>
          <span className="text-white font-bold text-base tracking-[4px] uppercase">
            FUTURA
          </span>
        </div>

      </div>
    </div>
  )
}

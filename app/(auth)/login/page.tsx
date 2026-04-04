'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Droplets, AlertCircle } from 'lucide-react'
import { isWebAuthnAvailable, webAuthnAuthenticate } from '@/lib/webauthn'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
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
    if (!email || !password) {
      setError('Ingresá tu email y contraseña')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email o contraseña incorrectos')
      } else if (result?.ok) {
        // Determine role for redirect
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
        email: data.email,
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
    <div className="min-h-dvh bg-gradient-to-br from-primary-800 to-primary-600 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4 ring-1 ring-white/20">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Control LSA</h1>
          <p className="text-primary-200 text-sm mt-1">Entradas y salidas de combustible</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-modal">
          <h2 className="text-lg font-semibold text-slate-800 mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`input ${error ? 'input-error' : ''}`}
                placeholder="admin@lsa.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

            {error && (
              <div className="flex items-center gap-2 text-danger-600 bg-danger-50 rounded-lg px-3 py-2.5 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : 'Ingresar'}
            </button>
          </form>

          {webAuthnSupported && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2">
                  o continuar con
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
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    <path d="M12 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    <path d="M12 12c-2.21 0-4 1.79-4 4h8c0-2.21-1.79-4-4-4z"/>
                  </svg>
                )}
                Face ID / Huella digital
              </button>
            </>
          )}
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">
          Control LSA &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

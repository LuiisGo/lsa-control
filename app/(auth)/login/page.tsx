'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

// toast was previously imported but only signIn errors are used now

const RATE_LIMIT_KEY    = 'login_rl_v1'
const MAX_ATTEMPTS      = 5
const LOCKOUT_MS        = 5 * 60 * 1000 // 5 minutos

interface RateLimit { attempts: number; lockedUntil: number }

function readRateLimit(): RateLimit {
  if (typeof window === 'undefined') return { attempts: 0, lockedUntil: 0 }
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY)
    if (!raw) return { attempts: 0, lockedUntil: 0 }
    return JSON.parse(raw) as RateLimit
  } catch {
    return { attempts: 0, lockedUntil: 0 }
  }
}

function writeRateLimit(rl: RateLimit) {
  try { localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rl)) } catch { /* ignore */ }
}

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lockoutUntil, setLockoutUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const rl = readRateLimit()
    if (rl.lockedUntil > Date.now()) setLockoutUntil(rl.lockedUntil)
  }, [])

  useEffect(() => {
    if (!lockoutUntil) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [lockoutUntil])

  const remainingMs = Math.max(0, lockoutUntil - now)
  const isLocked    = remainingMs > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return
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
        const rl = readRateLimit()
        const attempts = rl.attempts + 1
        const next: RateLimit = attempts >= MAX_ATTEMPTS
          ? { attempts: 0, lockedUntil: Date.now() + LOCKOUT_MS }
          : { attempts, lockedUntil: 0 }
        writeRateLimit(next)
        if (next.lockedUntil) {
          setLockoutUntil(next.lockedUntil)
          setError('Demasiados intentos. Esperá 5 minutos antes de intentar de nuevo.')
        } else {
          setError(`Usuario o contraseña incorrectos (${MAX_ATTEMPTS - attempts} intento${MAX_ATTEMPTS - attempts === 1 ? '' : 's'} restante${MAX_ATTEMPTS - attempts === 1 ? '' : 's'})`)
        }
      } else if (result?.ok) {
        writeRateLimit({ attempts: 0, lockedUntil: 0 })
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

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-4">
      <div className="w-full max-w-sm flex flex-col items-center">

        {/* ── Logo del sello ─────────────────────────────── */}
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/LSA-Logo.png"
            alt="Grupo Lechero San Antonio"
            width={140}
            height={140}
            className="rounded-full object-contain drop-shadow-lg"
          />
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
              disabled={loading || isLocked}
              className="btn-primary w-full text-base py-3.5 mt-1"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</>
              ) : isLocked ? (
                `Bloqueado · ${Math.ceil(remainingMs / 1000)}s`
              ) : 'Ingresar'}
            </button>
          </form>
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

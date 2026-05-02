import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { apiCall } from '@/lib/api'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const res = await apiCall<{
          token: string
          userId: string
          nombre: string
          email: string
          role: 'admin' | 'empleado'
          permisos: string[]
        }>('login', {
          email: credentials.username,    // el backend recibe el campo como "email"
          username: credentials.username, // por si el backend acepta "username"
          password: credentials.password,
        })

        if (!res.success || !res.data) return null

        return {
          id: res.data.userId,
          name: res.data.nombre,
          email: res.data.email,
          role: res.data.role,
          apiToken: res.data.token,
          permisos: res.data.permisos ?? [],
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { role: string; apiToken: string; id: string; permisos: string[] }
        token.role = u.role
        token.apiToken = u.apiToken
        token.userId = u.id
        token.permisos = u.permisos
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { role: string; apiToken: string; userId: string; permisos: string[] }
        u.role = token.role as string
        u.apiToken = token.apiToken as string
        u.userId = token.userId as string
        // Compat: si el JWT viene de una sesión anterior sin `permisos` o
        // el arreglo está vacío, asumir todos los permisos (mismo comportamiento
        // que `_parsePermisos` en Apps Script con celda vacía).
        const rawPermisos = token.permisos as string[] | undefined
        const allPermisos = ['cargas', 'medicion', 'envios', 'gastos', 'remanentes']
        u.permisos = Array.isArray(rawPermisos) && rawPermisos.length > 0 ? rawPermisos : allPermisos
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET no está configurado. Define la variable de entorno antes de hacer deploy.'
  )
}

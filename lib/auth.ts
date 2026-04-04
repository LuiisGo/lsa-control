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
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { role: string; apiToken: string; id: string }
        token.role = u.role
        token.apiToken = u.apiToken
        token.userId = u.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role: string; apiToken: string; userId: string }).role = token.role as string
        ;(session.user as { role: string; apiToken: string; userId: string }).apiToken = token.apiToken as string
        ;(session.user as { role: string; apiToken: string; userId: string }).userId = token.userId as string
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
  secret: process.env.NEXTAUTH_SECRET ?? 'lsa-control-fallback-secret-futura-2026',
}

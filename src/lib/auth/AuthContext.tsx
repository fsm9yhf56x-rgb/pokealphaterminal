'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Plan = 'free'|'pro'

export type User = {
  id:        string
  email:     string
  name:      string
  plan:      Plan
  avatar:    string
  joinedAt:  string
  xp:        number
  streak:    number
}

type AuthCtx = {
  user:     User | null
  loading:  boolean
  login:    (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signup:   (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout:   () => void
  setPlan:  (plan: Plan) => void
}

const Ctx = createContext<AuthCtx | null>(null)

const MOCK_USERS: (User & { password: string })[] = [
  {
    id:'1', email:'demo@pokealphaterminal.io', password:'demo1234',
    name:'Dracaufeu', plan:'free', avatar:'D',
    joinedAt:'2026-01-15', xp:1240, streak:7,
  },
  {
    id:'2', email:'pro@pokealphaterminal.io', password:'pro1234',
    name:'AshPro', plan:'pro', avatar:'A',
    joinedAt:'2026-02-01', xp:3800, streak:21,
  },
]

function initials(name: string) {
  return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pat_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setLoading(false)
  }, [])

  const persist = (u: User|null) => {
    setUser(u)
    if (u) localStorage.setItem('pat_user', JSON.stringify(u))
    else    localStorage.removeItem('pat_user')
  }

  const login = async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 600)) // simulate API
    const found = MOCK_USERS.find(u => u.email.toLowerCase()===email.toLowerCase() && u.password===password)
    if (!found) return { ok:false, error:'Email ou mot de passe incorrect.' }
    const { password:_, ...u } = found
    persist(u)
    return { ok:true }
  }

  const signup = async (name: string, email: string, password: string) => {
    await new Promise(r => setTimeout(r, 700))
    const exists = MOCK_USERS.find(u => u.email.toLowerCase()===email.toLowerCase())
    if (exists) return { ok:false, error:'Un compte existe déjà avec cet email.' }
    const u: User = {
      id:       Date.now().toString(),
      email, name,
      plan:     'free',
      avatar:   initials(name),
      joinedAt: new Date().toISOString().slice(0,10),
      xp:       0,
      streak:   0,
    }
    persist(u)
    return { ok:true }
  }

  const logout = () => persist(null)

  const setPlan = (plan: Plan) => {
    if (!user) return
    const u = { ...user, plan }
    persist(u)
  }

  return <Ctx.Provider value={{ user, loading, login, signup, logout, setPlan }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

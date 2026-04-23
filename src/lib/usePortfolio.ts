'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './useAuth'
import type { PortfolioCard } from './database.types'

const LS_KEY = 'pka_portfolio'

function getLocalCards(): PortfolioCard[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function setLocalCards(cards: PortfolioCard[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cards)) } catch {}
}

export function usePortfolio() {
  const { user, loading: authLoading } = useAuth()
  const [cards, setCards] = useState<PortfolioCard[]>([])
  const [loading, setLoading] = useState(true)
  const [migrated, setMigrated] = useState(false)

  // Load cards
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setCards(getLocalCards())
      setLoading(false)
      return
    }

    loadFromSupabase()
  }, [user, authLoading])

  async function loadFromSupabase() {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_cards')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Portfolio load error:', error)
      setCards(getLocalCards())
    } else {
      const supaCards = (data || []) as PortfolioCard[]

      // Migration: si Supabase est vide mais localStorage a des cartes
      if (supaCards.length === 0 && !migrated) {
        const localCards = getLocalCards()
        if (localCards.length > 0) {
          await migrateToSupabase(localCards)
          return
        }
      }

      setCards(supaCards)
    }
    setLoading(false)
  }

  async function migrateToSupabase(localCards: PortfolioCard[]) {
    setMigrated(true)
    const toInsert = localCards.map(c => ({
      user_id: user!.id,
      name: c.name,
      set_name: c.set_name || null,
      set_id: c.set_id || null,
      card_number: c.card_number || null,
      lang: c.lang || 'FR',
      rarity: c.rarity || null,
      card_type: c.card_type || null,
      condition: c.condition || 'NM',
      graded: c.graded || false,
      grade_company: c.grade_company || null,
      grade_value: c.grade_value || null,
      qty: c.qty || 1,
      buy_price: c.buy_price || null,
      buy_date: c.buy_date || null,
      current_price: c.current_price || null,
      image_url: c.image_url || null,
      notes: c.notes || null,
      is_favorite: c.is_favorite || false,
    }))

    const { error } = await supabase.from('portfolio_cards').insert(toInsert)
    if (error) {
      console.error('Migration error:', error)
    } else {
      console.log(`Migrated ${toInsert.length} cards to Supabase`)
    }
    await loadFromSupabase()
  }

  const addCard = useCallback(async (card: Partial<PortfolioCard>) => {
    if (!user) {
      const newCard = { ...card, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PortfolioCard
      const updated = [newCard, ...cards]
      setCards(updated)
      setLocalCards(updated)
      return newCard
    }

    // DB requires: name, condition, qty (NOT NULL). Provide safe defaults.
    if (!card.name) {
      console.error('Add card error: name is required')
      return null
    }
    const { data, error } = await supabase
      .from('portfolio_cards')
      .insert({
        ...card,
        user_id: user.id,
        name: card.name,
        condition: card.condition ?? 'Raw',
        qty: card.qty ?? 1,
      })
      .select()
      .single()

    if (error) { console.error('Add card error:', error); return null }
    setCards(prev => [data as PortfolioCard, ...prev])
    return data as PortfolioCard
  }, [user, cards])

  const updateCard = useCallback(async (id: string, updates: Partial<PortfolioCard>) => {
    if (!user) {
      const updated = cards.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c)
      setCards(updated)
      setLocalCards(updated)
      return
    }

    const { error } = await supabase
      .from('portfolio_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) console.error('Update card error:', error)
    else setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [user, cards])

  const deleteCard = useCallback(async (id: string) => {
    if (!user) {
      const updated = cards.filter(c => c.id !== id)
      setCards(updated)
      setLocalCards(updated)
      return
    }

    const { error } = await supabase
      .from('portfolio_cards')
      .delete()
      .eq('id', id)

    if (error) console.error('Delete card error:', error)
    else setCards(prev => prev.filter(c => c.id !== id))
  }, [user, cards])

  const toggleFavorite = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id)
    if (card) await updateCard(id, { is_favorite: !card.is_favorite })
  }, [cards, updateCard])

  return {
    cards,
    loading: loading || authLoading,
    addCard,
    updateCard,
    deleteCard,
    toggleFavorite,
    isCloud: !!user,
    cardCount: cards.length,
  }
}

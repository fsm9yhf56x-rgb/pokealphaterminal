'use client'
import { useParams } from 'next/navigation'
import { CardDetailPage } from '@/components/features/card/CardDetailPage'

export default function CardePage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '')
  return <CardDetailPage cardId={decodeURIComponent(id)} />
}

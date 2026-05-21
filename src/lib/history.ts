'use client'

import { BrowsingHistoryItem, Category } from '@/types'

const STORAGE_KEY = 'news_browsing_history'
const MAX_ITEMS = 50

export function getHistory(): BrowsingHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BrowsingHistoryItem[]) : []
  } catch {
    return []
  }
}

export function addToHistory(item: Omit<BrowsingHistoryItem, 'visitedAt'>): void {
  if (typeof window === 'undefined') return
  const history = getHistory().filter(h => h.topicId !== item.topicId)
  const next: BrowsingHistoryItem[] = [
    { ...item, visitedAt: new Date().toISOString() },
    ...history,
  ].slice(0, MAX_ITEMS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function getRecommendedKeywords(): string[] {
  const history = getHistory()
  if (history.length === 0) return []
  // 頻出キーワードを集計してトップ5を返す
  const freq: Record<string, number> = {}
  for (const item of history) {
    const words = item.keyword.split(/[\s　]+/)
    for (const w of words) {
      if (w.length >= 2) freq[w] = (freq[w] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k)
}

export function getRecommendedCategories(): Category[] {
  const history = getHistory()
  const freq: Record<string, number> = {}
  for (const item of history) {
    if (item.category) freq[item.category] = (freq[item.category] ?? 0) + 1
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c as Category)
}

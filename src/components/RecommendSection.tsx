'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHistory, getRecommendedKeywords } from '@/lib/history'
import { BrowsingHistoryItem } from '@/types'
import { Sparkles, Clock } from 'lucide-react'

export default function RecommendSection() {
  const [history, setHistory] = useState<BrowsingHistoryItem[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    setHistory(getHistory().slice(0, 5))
    setKeywords(getRecommendedKeywords())
  }, [])

  if (history.length === 0) return null

  const handleKeyword = (kw: string) => {
    router.push(`/topic/${encodeURIComponent(kw)}`)
  }

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
        <Sparkles size={16} className="text-yellow-500" />
        あなたへのおすすめ
      </h2>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {keywords.map(kw => (
            <button
              key={kw}
              onClick={() => handleKeyword(kw)}
              className="px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full text-sm text-yellow-800 hover:bg-yellow-100 transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <Clock size={12} />
          最近見たトピック
        </p>
        {history.map(item => (
          <button
            key={item.topicId}
            onClick={() => handleKeyword(item.keyword)}
            className="w-full text-left px-4 py-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-800">{item.keyword}</span>
            {item.category && (
              <span className="ml-2 text-xs text-gray-500">{item.category}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

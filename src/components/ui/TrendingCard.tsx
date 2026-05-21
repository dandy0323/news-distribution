'use client'

import { Article } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { addToHistory } from '@/lib/history'

interface Props {
  article: Article
  rank?: number
}

export default function TrendingCard({ article, rank }: Props) {
  const router = useRouter()

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: ja })
    } catch {
      return ''
    }
  })()

  const handleClick = () => {
    const keyword = article.title.slice(0, 30)
    const topicId = encodeURIComponent(keyword)
    addToHistory({ keyword, topicId, category: article.category })
    router.push(`/topic/${topicId}?title=${encodeURIComponent(article.title)}`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span className={`shrink-0 text-2xl font-bold ${rank < 3 ? 'text-blue-500' : 'text-gray-300'}`}>
            {rank + 1}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-600 font-medium mb-1">{article.source}</p>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{article.title}</h3>
          {timeAgo && <p className="mt-1.5 text-xs text-gray-400">{timeAgo}</p>}
        </div>
      </div>
    </button>
  )
}

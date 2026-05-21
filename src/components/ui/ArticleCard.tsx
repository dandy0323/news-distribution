import { Article } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ExternalLink } from 'lucide-react'

interface Props {
  article: Article
  compact?: boolean
}

export default function ArticleCard({ article, compact = false }: Props) {
  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: ja })
    } catch {
      return ''
    }
  })()

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-600 font-medium mb-1">{article.source}</p>
          <h3 className={`font-semibold text-gray-900 leading-snug ${compact ? 'text-sm line-clamp-2' : 'text-base line-clamp-3'}`}>
            {article.title}
          </h3>
          {!compact && article.description && (
            <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{article.description}</p>
          )}
        </div>
        <ExternalLink className="shrink-0 text-gray-400 mt-0.5" size={14} />
      </div>
      {timeAgo && <p className="mt-2 text-xs text-gray-400">{timeAgo}</p>}
    </a>
  )
}

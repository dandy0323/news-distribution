'use client'

import { useState, useEffect } from 'react'
import { Article } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ExternalLink, ImageOff } from 'lucide-react'

interface Props {
  article: Article
  compact?: boolean
}

function Thumbnail({ src, alt }: { src?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (imgSrc || failed) return
    // RSS に画像なし → OGイメージをプロキシ経由で取得
  }, [imgSrc, failed])

  if (failed || !imgSrc) {
    return (
      <div className="w-20 h-20 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
        <ImageOff size={18} className="text-gray-300" />
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => { setImgSrc(undefined); setFailed(true) }}
      className="w-20 h-20 shrink-0 rounded-lg object-cover bg-gray-100"
    />
  )
}

export default function ArticleCard({ article, compact = false }: Props) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(article.imageUrl)

  useEffect(() => {
    if (imgSrc || !article.url) return
    fetch(`/api/og-image?url=${encodeURIComponent(article.url)}`)
      .then(r => r.json())
      .then((d: { imageUrl?: string }) => { if (d.imageUrl) setImgSrc(d.imageUrl) })
      .catch(() => {})
  }, [article.url, imgSrc])

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: ja })
    } catch { return '' }
  })()

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-blue-600 font-medium mb-1">{article.source}</p>
        <h3 className={`font-semibold text-gray-900 leading-snug ${compact ? 'text-sm line-clamp-2' : 'text-base line-clamp-3'}`}>
          {article.title}
        </h3>
        {!compact && article.description && (
          <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{article.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {timeAgo && <span className="text-xs text-gray-400">{timeAgo}</span>}
          <ExternalLink size={11} className="text-gray-300" />
        </div>
      </div>
      <Thumbnail src={imgSrc} alt={article.title} />
    </a>
  )
}

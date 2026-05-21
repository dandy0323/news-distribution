'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/ui/SearchBar'
import CategoryChips from '@/components/ui/CategoryChips'
import TrendingCard from '@/components/ui/TrendingCard'
import RecommendSection from '@/components/RecommendSection'
import { Article, Category } from '@/types'
import { Newspaper, Loader2 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<Category>('すべて')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  const fetchArticles = useCallback(async (kw: string, cat: Category) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (kw) params.set('q', kw)
      if (cat !== 'すべて') params.set('category', cat)
      const res = await fetch(`/api/news/search?${params}`)
      const data = await res.json() as { articles: Article[] }
      setArticles(data.articles ?? [])
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArticles('', 'すべて')
  }, [fetchArticles])

  const handleSearch = (kw: string) => {
    setKeyword(kw)
    if (kw) {
      router.push(`/topic/${encodeURIComponent(kw)}`)
    } else {
      fetchArticles('', category)
    }
  }

  const handleCategory = (cat: Category) => {
    setCategory(cat)
    fetchArticles(keyword, cat)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Newspaper className="text-blue-600 shrink-0" size={22} />
          <span className="font-bold text-gray-900 text-lg">NewsCuration</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Search */}
        <SearchBar onSearch={handleSearch} placeholder="キーワードでニュースを検索..." />

        {/* Category filter */}
        <CategoryChips selected={category} onChange={handleCategory} />

        {/* Trending news */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">
            {keyword
              ? `「${keyword}」の検索結果`
              : category !== 'すべて'
              ? `${category}のニュース`
              : '話題のニュース'}
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : articles.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">ニュースが見つかりませんでした</p>
          ) : (
            <div className="space-y-3">
              {articles.map((article, i) => (
                <TrendingCard key={article.id} article={article} rank={i} />
              ))}
            </div>
          )}
        </section>

        {/* Recommendations based on browsing history */}
        <RecommendSection />
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchBar from '@/components/ui/SearchBar'
import CategoryChips from '@/components/ui/CategoryChips'
import TrendingCard from '@/components/ui/TrendingCard'
import RecommendSection from '@/components/RecommendSection'
import DateFilter, { DateFilterType, DateRange } from '@/components/ui/DateFilter'
import { Article, Category } from '@/types'
import { Newspaper, Loader2 } from 'lucide-react'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<Category>(
    (searchParams.get('category') as Category) ?? 'すべて'
  )
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('none')
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' })

  const fetchArticles = useCallback(async (kw: string, cat: Category, filterType: DateFilterType, range: DateRange) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (kw) params.set('q', kw)
      if (cat !== 'すべて') params.set('category', cat)
      if (filterType !== 'none' && range.from) params.set('from', range.from)
      if (filterType !== 'none' && range.to) params.set('to', range.to)
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
    fetchArticles(keyword, category, dateFilterType, dateRange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (kw: string) => {
    setKeyword(kw)
    if (kw) {
      router.push(`/topic/${encodeURIComponent(kw)}`)
    } else {
      fetchArticles('', category, dateFilterType, dateRange)
    }
  }

  const handleCategory = (cat: Category) => {
    setCategory(cat)
    const url = cat === 'すべて' ? '/' : `/?category=${encodeURIComponent(cat)}`
    router.replace(url, { scroll: false })
    fetchArticles(keyword, cat, dateFilterType, dateRange)
  }

  const handleDateFilter = (type: DateFilterType, range: DateRange) => {
    setDateFilterType(type)
    setDateRange(range)
    fetchArticles(keyword, category, type, range)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <SearchBar onSearch={handleSearch} placeholder="キーワードでニュースを検索..." />
      <CategoryChips selected={category} onChange={handleCategory} />
      <DateFilter value={dateFilterType} customRange={dateRange} onChange={handleDateFilter} />

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

      <RecommendSection />
    </main>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Newspaper className="text-blue-600 shrink-0" size={22} />
          <span className="font-bold text-gray-900 text-lg">NewsCuration</span>
        </div>
      </header>
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      }>
        <HomeContent />
      </Suspense>
    </div>
  )
}

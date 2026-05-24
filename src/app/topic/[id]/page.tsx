'use client'

import { useState, useEffect, use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SearchBar from '@/components/ui/SearchBar'
import ArticleCard from '@/components/ui/ArticleCard'
import { Article, ReportingTrend, TopicHistory } from '@/types'
import { addToHistory } from '@/lib/history'
import {
  Loader2,
  Sparkles,
  BarChart2,
  History,
  ChevronLeft,
  Newspaper,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'

type AiSection = 'summary' | 'trends' | 'history'

const TONE_LABEL: Record<ReportingTrend['tone'], { label: string; color: string }> = {
  positive: { label: 'ポジティブ', color: 'bg-green-100 text-green-700' },
  neutral: { label: 'ニュートラル', color: 'bg-gray-100 text-gray-700' },
  negative: { label: 'ネガティブ', color: 'bg-red-100 text-red-700' },
  critical: { label: '批判的', color: 'bg-orange-100 text-orange-700' },
}

export default function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const keyword = decodeURIComponent(id)
  const titleFromQuery = searchParams.get('title') ?? keyword

  const [articles, setArticles] = useState<Article[]>([])
  const [loadingArticles, setLoadingArticles] = useState(true)

  const [summary, setSummary] = useState('')
  const [trends, setTrends] = useState<ReportingTrend[]>([])
  const [topicHistory, setTopicHistory] = useState<TopicHistory | null>(null)
  const [aiLoading, setAiLoading] = useState<Partial<Record<AiSection, boolean>>>({})
  const [aiError, setAiError] = useState<Partial<Record<AiSection, string>>>({})
  // 複数セクションを同時に開けるよう Set で管理
  const [openSections, setOpenSections] = useState<Set<AiSection>>(new Set())

  useEffect(() => {
    addToHistory({ keyword, topicId: id })
    ;(async () => {
      setLoadingArticles(true)
      try {
        const res = await fetch(`/api/news/search?q=${encodeURIComponent(keyword)}`)
        const data = await res.json() as { articles: Article[] }
        setArticles(data.articles ?? [])
      } finally {
        setLoadingArticles(false)
      }
    })()
  }, [keyword, id])

  const callAi = async (type: AiSection) => {
    if (aiLoading[type]) return
    setAiLoading(prev => ({ ...prev, [type]: true }))
    setOpenSections(prev => new Set(prev).add(type))
    setAiError(prev => ({ ...prev, [type]: undefined }))
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, articles, type }),
      })
      const data = await res.json() as { result?: unknown; error?: string }
      if (!res.ok || data.error) {
        setAiError(prev => ({ ...prev, [type]: data.error ?? '生成に失敗しました' }))
        return
      }
      if (type === 'summary') setSummary(data.result as string)
      else if (type === 'trends') setTrends(data.result as ReportingTrend[])
      else if (type === 'history') setTopicHistory(data.result as TopicHistory)
    } catch {
      setAiError(prev => ({ ...prev, [type]: 'ネットワークエラーが発生しました' }))
    } finally {
      setAiLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  const hasContent = (type: AiSection) => {
    if (type === 'summary') return !!summary
    if (type === 'trends') return trends.length > 0
    if (type === 'history') return !!topicHistory
    return false
  }

  const toggleSection = (type: AiSection) => {
    const isOpen = openSections.has(type)
    if (isOpen && !aiError[type]) {
      // 開いていてエラーなし → 閉じる
      setOpenSections(prev => { const s = new Set(prev); s.delete(type); return s })
    } else if (!hasContent(type) || aiError[type]) {
      // 未生成 or エラー → 生成（セクションは開いたまま）
      callAi(type)
    } else {
      // 生成済みで閉じている → 開く
      setOpenSections(prev => new Set(prev).add(type))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft size={22} />
          </button>
          <Newspaper className="text-blue-600 shrink-0" size={20} />
          <span className="font-bold text-gray-900 text-base truncate">{titleFromQuery}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <SearchBar
          initialValue={keyword}
          onSearch={kw => kw && router.push(`/topic/${encodeURIComponent(kw)}`)}
          placeholder="別のキーワードで検索..."
        />

        {/* ── 要約 ── */}
        <AiCard
          icon={<Sparkles size={16} className="text-yellow-500" />}
          title="要約"
          open={openSections.has('summary')}
          loading={!!aiLoading.summary}
          onToggle={() => toggleSection('summary')}
          hasContent={!!summary}
          error={aiError.summary}
        >
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        </AiCard>

        {/* ── 収集記事一覧 ── */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">
            収集記事 {!loadingArticles && `(${articles.length}件)`}
          </h2>
          {loadingArticles ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : articles.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">記事が見つかりませんでした</p>
          ) : (
            <div className="space-y-3">
              {articles.map(a => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </section>

        {/* ── 各社の報道傾向 ── */}
        <AiCard
          icon={<BarChart2 size={16} className="text-blue-500" />}
          title="各社の報道傾向"
          open={openSections.has('trends')}
          loading={!!aiLoading.trends}
          onToggle={() => toggleSection('trends')}
          hasContent={trends.length > 0}
          error={aiError.trends}
        >
          <div className="space-y-3">
            {trends.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{t.source}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TONE_LABEL[t.tone]?.color ?? 'bg-gray-100 text-gray-700'}`}>
                    {TONE_LABEL[t.tone]?.label ?? t.tone}
                  </span>
                  <span className="text-xs text-blue-600 font-medium">{t.angle}</span>
                </div>
                <p className="text-sm text-gray-600">{t.summary}</p>
              </div>
            ))}
          </div>
        </AiCard>

        {/* ── 経緯・背景まとめ ── */}
        <AiCard
          icon={<History size={16} className="text-purple-500" />}
          title="経緯・背景まとめ"
          open={openSections.has('history')}
          loading={!!aiLoading.history}
          onToggle={() => toggleSection('history')}
          hasContent={!!topicHistory}
          error={aiError.history}
        >
          {topicHistory && (
            <div className="space-y-4">
              {/* 時系列 */}
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  <Clock size={12} />
                  時系列
                </p>
                <ul className="space-y-1.5">
                  {topicHistory.timeline.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-purple-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 原因 */}
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  <AlertCircle size={12} />
                  原因
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{topicHistory.cause}</p>
              </div>

              {/* 今後の見通し */}
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  <TrendingUp size={12} />
                  今後の見通し
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{topicHistory.outlook}</p>
              </div>
            </div>
          )}
        </AiCard>
      </main>
    </div>
  )
}

interface AiCardProps {
  icon: React.ReactNode
  title: string
  open: boolean
  loading: boolean
  onToggle: () => void
  hasContent: boolean
  error?: string
  children: React.ReactNode
}

function AiCard({ icon, title, open, loading, onToggle, hasContent, error, children }: AiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
          {icon}
          {title}
        </span>
        <span className="flex items-center gap-2 text-xs text-gray-500">
          {error && <span className="text-red-500">再試行する</span>}
          {!hasContent && !loading && !error && '生成する'}
          {loading && <Loader2 size={14} className="animate-spin" />}
          {open && !error ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              生成中...
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

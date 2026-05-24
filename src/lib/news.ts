import Parser from 'rss-parser'
import { Article, Category } from '@/types'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'NewsCuration/1.0' },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
    ],
  },
})

const CATEGORY_QUERY_MAP: Record<Exclude<Category, 'すべて'>, string> = {
  政治: '政治 国会 内閣 政府',
  経済: '経済 景気 日銀 株式市場',
  社会: '社会 事件 事故 裁判',
  テクノロジー: 'テクノロジー AI IT スタートアップ',
  エンタメ: '芸能 映画 音楽 ドラマ',
  スポーツ: 'スポーツ 野球 サッカー バスケ',
  国際: '国際 外交 海外 米国 中国',
  科学: '科学 研究 宇宙 医療',
}

// 非経済カテゴリで除外する金融・IR記事のパターン
const FINANCIAL_NOISE_PATTERNS = [
  '決算短信', '適時開示', '四半期決算', '業績予想', '有価証券報告',
  '株価', 'IR情報', '純利益', '営業利益', '売上高',
]

function isFinancialNoise(article: Article): boolean {
  const text = `${article.title} ${article.description}`
  return FINANCIAL_NOISE_PATTERNS.some(p => text.includes(p))
}

// 信頼できるメディアの識別キーワード（部分一致・大文字小文字無視）
const TRUSTED_SOURCE_PATTERNS = [
  // 日本：主要全国紙
  '日本経済新聞', '日経',
  '読売新聞', '読売',
  '朝日新聞', '朝日',
  '毎日新聞', '毎日',
  '産経新聞', '産経',
  '東京新聞',
  // 日本：通信社
  '時事通信', '時事',
  '共同通信', '共同',
  // 日本：放送局
  'NHK',
  'TBS',
  'テレビ朝日', 'tv asahi',
  '日本テレビ', 'ntv',
  'フジテレビ', 'フジ', 'fnn',
  'テレビ東京', 'tx',
  // 日本：専門紙・経済
  'ブルームバーグ', 'bloomberg',
  '日刊工業新聞',
  // 海外：通信社
  'ロイター', 'reuters',
  'ap通信', 'associated press',
  'afp',
  // 海外：放送・メディア
  'bbc',
  'cnn',
  'the guardian',
  'washington post',
  'new york times', 'nyt',
  'financial times', 'ft',
  'the economist',
  'al jazeera', 'アルジャジーラ',
  'nbc',
  'abc news',
  'fox news',
  'axios',
]

function isTrustedSource(source: string): boolean {
  const s = source.toLowerCase()
  return TRUSTED_SOURCE_PATTERNS.some(p => s.includes(p.toLowerCase()))
}

function buildGoogleNewsUrl(query: string, lang = 'ja', country = 'JP'): string {
  const encoded = encodeURIComponent(query)
  return `https://news.google.com/rss/search?q=${encoded}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`
}

function extractSourceFromTitle(title: string): string | null {
  const parts = title.split(' - ')
  if (parts.length >= 2) return parts[parts.length - 1].trim()
  return null
}

function extractSource(feedUrl: string, item: Parser.Item & { source?: { _?: string; url?: string } }): string {
  if (item.source?._) return item.source._
  const fromTitle = item.title ? extractSourceFromTitle(item.title) : null
  if (fromTitle) return fromTitle
  try {
    const url = new URL(item.link ?? feedUrl)
    return url.hostname.replace('www.', '')
  } catch {
    return '不明'
  }
}

async function resolveArticleUrl(url: string): Promise<string> {
  if (!url.includes('news.google.com')) return url
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    clearTimeout(timer)
    return res.url !== url ? res.url : url
  } catch {
    return url
  }
}

async function resolveUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(resolveArticleUrl))
}

function isWithinDays(publishedAt: string, days: number): boolean {
  try {
    const pub = new Date(publishedAt).getTime()
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return pub >= cutoff
  } catch {
    return true
  }
}

type RssItem = Parser.Item & {
  source?: { _?: string }
  mediaContent?: { $?: { url?: string } } | { $?: { url?: string } }[]
  mediaThumbnail?: { $?: { url?: string } }
  enclosure?: { url?: string }
}

function extractImageFromItem(item: RssItem): string | undefined {
  if (Array.isArray(item.mediaContent)) {
    return item.mediaContent[0]?.$?.url
  }
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url
  if (item.enclosure?.url) return item.enclosure.url
  return undefined
}

function buildArticles(
  items: RssItem[],
  resolvedUrls: string[],
  feedUrl: string,
  prefix: string,
): Article[] {
  return items.map((item, i) => {
    const rawTitle = item.title ?? '(タイトルなし)'
    const source = extractSource(feedUrl, item)
    const title = rawTitle.endsWith(` - ${source}`)
      ? rawTitle.slice(0, -(` - ${source}`).length)
      : rawTitle
    return {
      id: `${prefix}-${i}-${Date.now()}`,
      title,
      url: resolvedUrls[i],
      source,
      publishedAt: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
      description: item.contentSnippet ?? item.content ?? '',
      imageUrl: extractImageFromItem(item),
    }
  })
}

// 信頼メディア＋時系列の二段階フィルタ（dateFrom/dateTo が指定された場合はその範囲を使用）
function applyFilters(all: Article[], maxItems: number, dateFrom?: Date, dateTo?: Date): Article[] {
  const inRange = (a: Article) => {
    if (!dateFrom && !dateTo) return true
    try {
      const pub = new Date(a.publishedAt).getTime()
      if (dateFrom && pub < dateFrom.getTime()) return false
      if (dateTo && pub > dateTo.getTime()) return false
      return true
    } catch { return true }
  }

  // 日付範囲が明示指定された場合はそれを優先
  if (dateFrom || dateTo) {
    const ranged = all.filter(a => inRange(a))
    if (ranged.length > 0) {
      const trustedRanged = ranged.filter(a => isTrustedSource(a.source))
      const result = trustedRanged.length >= 3 ? trustedRanged : ranged
      return result.slice(0, maxItems)
    }
    // 指定範囲に記事がなければ以降のカスケードへフォールスルー
  }

  // デフォルト: 直近3日 → 7日 → 30日 → 全期間の順でフォールバック
  const trusted = all.filter(a => isTrustedSource(a.source))
  const trusted3 = trusted.filter(a => isWithinDays(a.publishedAt, 3))
  if (trusted3.length >= 3) return trusted3.slice(0, maxItems)

  const trusted7 = trusted.filter(a => isWithinDays(a.publishedAt, 7))
  if (trusted7.length >= 3) return trusted7.slice(0, maxItems)

  const trusted30 = trusted.filter(a => isWithinDays(a.publishedAt, 30))
  if (trusted30.length >= 3) return trusted30.slice(0, maxItems)

  if (trusted.length >= 3) return trusted.slice(0, maxItems)

  const recent3 = all.filter(a => isWithinDays(a.publishedAt, 3))
  if (recent3.length >= 3) return recent3.slice(0, maxItems)

  return all.slice(0, maxItems)
}

export async function fetchNewsByKeyword(keyword: string, maxItems = 20, dateFrom?: Date, dateTo?: Date): Promise<Article[]> {
  const feedUrl = buildGoogleNewsUrl(keyword)
  try {
    const feed = await parser.parseURL(feedUrl)
    const items = (feed.items ?? []).slice(0, 60) as RssItem[]
    const rawUrls = items.map(item => item.link ?? '')
    const resolvedUrls = await resolveUrls(rawUrls)
    const all = buildArticles(items, resolvedUrls, feedUrl, keyword)
    return applyFilters(all, maxItems, dateFrom, dateTo)
  } catch (err) {
    console.error('[fetchNewsByKeyword]', err)
    return []
  }
}

export async function fetchNewsByCategory(category: Exclude<Category, 'すべて'>, maxItems = 20, dateFrom?: Date, dateTo?: Date): Promise<Article[]> {
  const query = CATEGORY_QUERY_MAP[category]
  const articles = await fetchNewsByKeyword(query, maxItems * 2, dateFrom, dateTo)
  const filtered = category === '経済'
    ? articles
    : articles.filter(a => !isFinancialNoise(a))
  return filtered.slice(0, maxItems).map(a => ({ ...a, category }))
}

export async function fetchTrendingTopics(dateFrom?: Date, dateTo?: Date): Promise<Article[]> {
  const feedUrl = `https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja`
  try {
    const feed = await parser.parseURL(feedUrl)
    const items = (feed.items ?? []).slice(0, 60) as RssItem[]
    const rawUrls = items.map(item => item.link ?? '')
    const resolvedUrls = await resolveUrls(rawUrls)
    const all = buildArticles(items, resolvedUrls, feedUrl, 'trending')
    return applyFilters(all, 30, dateFrom, dateTo)
  } catch (err) {
    console.error('[fetchTrendingTopics]', err)
    return []
  }
}

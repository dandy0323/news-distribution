import Parser from 'rss-parser'
import { Article, Category } from '@/types'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'NewsCuration/1.0' },
})

const CATEGORY_QUERY_MAP: Record<Exclude<Category, 'すべて'>, string> = {
  政治: 'politics japan',
  経済: 'economy japan',
  社会: 'society japan',
  テクノロジー: 'technology',
  エンタメ: 'entertainment japan',
  スポーツ: 'sports japan',
  国際: 'world news',
  科学: 'science',
}

function buildGoogleNewsUrl(query: string, lang = 'ja', country = 'JP'): string {
  const encoded = encodeURIComponent(query)
  return `https://news.google.com/rss/search?q=${encoded}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`
}

function extractSourceFromTitle(title: string): string | null {
  // Google News titles end with " - 出典元名"
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

function resolveGoogleNewsUrl(rawUrl: string): string {
  // Google News wraps URLs — return as-is (redirect happens on click)
  return rawUrl
}

export async function fetchNewsByKeyword(keyword: string, maxItems = 20): Promise<Article[]> {
  const feedUrl = buildGoogleNewsUrl(keyword)
  try {
    const feed = await parser.parseURL(feedUrl)
    return (feed.items ?? []).slice(0, maxItems).map((item, i) => {
      const rawTitle = item.title ?? '(タイトルなし)'
      const source = extractSource(feedUrl, item as Parser.Item & { source?: { _?: string } })
      // タイトル末尾の " - 出典元名" を除去
      const title = rawTitle.endsWith(` - ${source}`)
        ? rawTitle.slice(0, -(` - ${source}`).length)
        : rawTitle
      return {
        id: `${keyword}-${i}-${Date.now()}`,
        title,
        url: resolveGoogleNewsUrl(item.link ?? ''),
        source,
        publishedAt: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
        description: item.contentSnippet ?? item.content ?? '',
      }
    })
  } catch (err) {
    console.error('[fetchNewsByKeyword]', err)
    return []
  }
}

export async function fetchNewsByCategory(category: Exclude<Category, 'すべて'>, maxItems = 20): Promise<Article[]> {
  const query = CATEGORY_QUERY_MAP[category]
  const articles = await fetchNewsByKeyword(query, maxItems)
  return articles.map(a => ({ ...a, category }))
}

export async function fetchTrendingTopics(): Promise<Article[]> {
  const feedUrl = `https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja`
  try {
    const feed = await parser.parseURL(feedUrl)
    return (feed.items ?? []).slice(0, 30).map((item, i) => {
      const rawTitle = item.title ?? '(タイトルなし)'
      const source = extractSource(feedUrl, item as Parser.Item & { source?: { _?: string } })
      const title = rawTitle.endsWith(` - ${source}`)
        ? rawTitle.slice(0, -(` - ${source}`).length)
        : rawTitle
      return {
        id: `trending-${i}-${Date.now()}`,
        title,
        url: resolveGoogleNewsUrl(item.link ?? ''),
        source,
        publishedAt: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
        description: item.contentSnippet ?? '',
      }
    })
  } catch (err) {
    console.error('[fetchTrendingTopics]', err)
    return []
  }
}

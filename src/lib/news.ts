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

// 記事が直近N日以内かチェック
function isWithinDays(publishedAt: string, days: number): boolean {
  try {
    const pub = new Date(publishedAt).getTime()
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return pub >= cutoff
  } catch {
    return true
  }
}

function buildArticles(
  items: (Parser.Item & { source?: { _?: string } })[],
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
    }
  })
}

export async function fetchNewsByKeyword(keyword: string, maxItems = 20): Promise<Article[]> {
  const feedUrl = buildGoogleNewsUrl(keyword)
  try {
    const feed = await parser.parseURL(feedUrl)
    const items = (feed.items ?? []).slice(0, 60) as (Parser.Item & { source?: { _?: string } })[]
    const rawUrls = items.map(item => item.link ?? '')
    const resolvedUrls = await resolveUrls(rawUrls)
    const all = buildArticles(items, resolvedUrls, feedUrl, keyword)

    // 直近7日以内の記事を優先。5件未満なら30日に自動拡張、それでも足りなければ全件
    const week = all.filter(a => isWithinDays(a.publishedAt, 7))
    const month = all.filter(a => isWithinDays(a.publishedAt, 30))
    const result = week.length >= 5 ? week : month.length > 0 ? month : all
    return result.slice(0, maxItems)
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
    const items = (feed.items ?? []).slice(0, 30) as (Parser.Item & { source?: { _?: string } })[]
    const rawUrls = items.map(item => item.link ?? '')
    const resolvedUrls = await resolveUrls(rawUrls)
    return buildArticles(items, resolvedUrls, feedUrl, 'trending')
  } catch (err) {
    console.error('[fetchTrendingTopics]', err)
    return []
  }
}

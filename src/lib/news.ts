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

// Google News のリダイレクト先（実際の記事URL）を取得する
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
    // リダイレクト後のURLが元と違えばそちらを返す
    return res.url !== url ? res.url : url
  } catch {
    return url
  }
}

// 複数URLを並列解決（失敗分は元URLのまま）
async function resolveUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(resolveArticleUrl))
}

// キーワードと記事タイトルの関連性チェック
// 3文字以上の部分文字列がタイトルに1つでも含まれれば「関連あり」とみなす。
// スペースなしの日本語キーワード（記事タイトルそのものなど）にも対応。
function isRelevant(article: Article, keyword: string): boolean {
  const k = keyword.toLowerCase()
  const title = article.title.toLowerCase()
  const WINDOW = 3
  if (k.length < WINDOW) return true
  for (let i = 0; i <= k.length - WINDOW; i++) {
    if (title.includes(k.slice(i, i + WINDOW))) return true
  }
  return false
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
    // Google NewsのRSS上限は通常100件。多めに取得してフィルタ後にmaxItems件確保する
    const items = (feed.items ?? []).slice(0, 100) as (Parser.Item & { source?: { _?: string } })[]
    const rawUrls = items.map(item => item.link ?? '')
    const resolvedUrls = await resolveUrls(rawUrls)
    const all = buildArticles(items, resolvedUrls, feedUrl, keyword)
    const filtered = all.filter(a => isRelevant(a, keyword))
    // フィルタ後に極端に少ない場合はフィルタなしにフォールバック（英語クエリ等の対策）
    const result = filtered.length >= 5 ? filtered : all
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

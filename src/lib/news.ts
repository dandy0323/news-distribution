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

// キーワードと記事の関連性チェック（日本語・英語対応）
function isRelevant(article: Article, keyword: string): boolean {
  // キーワードを2文字以上のトークンに分割（スペース・全角スペース区切り）
  const tokens = keyword
    .toLowerCase()
    .split(/[\s　]+/)
    .filter(t => t.length >= 2)
  if (tokens.length === 0) return true
  const text = `${article.title} ${article.description}`.toLowerCase()
  // いずれかのトークンが含まれていれば関連ありとみなす
  return tokens.some(token => text.includes(token))
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
    // 多めに取得してフィルタ後にmaxItems件に絞る
    const items = (feed.items ?? []).slice(0, maxItems * 2) as (Parser.Item & { source?: { _?: string } })[]
    const rawUrls = items.map(item => item.link ?? '')
    const resolvedUrls = await resolveUrls(rawUrls)
    const all = buildArticles(items, resolvedUrls, feedUrl, keyword)
    const filtered = all.filter(a => isRelevant(a, keyword))
    // フィルタ後0件になってしまった場合はフィルタなしで返す（カテゴリ検索など英語クエリ対策）
    return (filtered.length > 0 ? filtered : all).slice(0, maxItems)
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

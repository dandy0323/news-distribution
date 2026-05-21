import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'NewsCuration - AIニュースキュレーション',
  description: 'キーワード起点でニュースを収集・分析するAIキュレーションサービス',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 font-sans">{children}</body>
    </html>
  )
}

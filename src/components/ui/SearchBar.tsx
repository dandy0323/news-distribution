'use client'

import { useState, FormEvent } from 'react'
import { Search } from 'lucide-react'

interface Props {
  initialValue?: string
  onSearch: (keyword: string) => void
  placeholder?: string
}

export default function SearchBar({ initialValue = '', onSearch, placeholder = 'キーワードで検索...' }: Props) {
  const [value, setValue] = useState(initialValue)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
      />
    </form>
  )
}

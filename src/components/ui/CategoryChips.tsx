'use client'

import { Category } from '@/types'

const CATEGORIES: Category[] = [
  'すべて', '政治', '経済', '社会', 'テクノロジー', 'エンタメ', 'スポーツ', '国際', '科学',
]

interface Props {
  selected: Category
  onChange: (cat: Category) => void
}

export default function CategoryChips({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === cat
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

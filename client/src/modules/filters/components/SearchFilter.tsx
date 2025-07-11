import React, { memo, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

export const SearchFilter = memo<SearchFilterProps>(({
  value,
  onChange,
  placeholder = 'Search orders...',
  debounceMs = 300
}) => {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, debounceMs)
  
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue)
    }
  }, [debouncedValue, onChange, value])
  
  useEffect(() => {
    setLocalValue(value)
  }, [value])
  
  return (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-8"
        data-search-input
      />
    </div>
  )
})

SearchFilter.displayName = 'SearchFilter'
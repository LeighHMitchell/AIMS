import { useState, useEffect, useCallback } from "react"

/**
 * useLocalStorage — useState that persists to localStorage.
 *
 * Usage:
 *   const [pageLimit, setPageLimit] = useLocalStorage("budgets-page-limit", 25)
 *   const [columns, setColumns] = useLocalStorage<string[]>("visible-cols", defaultCols)
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue
    try {
      const saved = localStorage.getItem(key)
      if (saved === null) return defaultValue
      return JSON.parse(saved) as T
    } catch {
      return defaultValue
    }
  })

  // Sync to localStorage whenever value changes
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }, [key, storedValue])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value
        return nextValue
      })
    },
    [],
  )

  return [storedValue, setValue]
}

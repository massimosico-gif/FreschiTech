import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'

export const useMunicipalitySearch = (query) => {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query && query.length >= 2) {
      setLoading(true)
      const timer = setTimeout(() => {
        invoke('search_municipalities', { query })
          .then(data => {
            setResults(data)
            setLoading(false)
          })
          .catch(err => {
            console.error("Autocomplete error:", err)
            setLoading(false)
          })
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setResults([])
    }
  }, [query])

  return { results, loading }
}

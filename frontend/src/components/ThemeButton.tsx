import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('eventhub-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeButton() {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('eventhub-theme', theme) } catch {}
  }, [theme])
  return <button className="theme-button" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    aria-label={theme === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'}>
    {theme === 'light' ? 'Thème sombre' : 'Thème clair'}
  </button>
}

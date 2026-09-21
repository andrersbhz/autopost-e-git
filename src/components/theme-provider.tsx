import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Theme = "dark" | "light" | "system"
type PaletteName = "custom"

type SystemColors = {
  background: string
  surface: string
  surfaceAlt: string
  border: string
  primary: string
  accent: string
  textPrimary: string
  textMuted: string
  textOnPrimary: string
  textOnAccent: string
  sidebarBackground: string
  sidebarText: string
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
  palette: PaletteName
  setPalette: (palette: PaletteName) => void
  customPrimary: string
  customAccent: string
  setCustomColors: (primary: string, accent: string) => void
  systemColors: SystemColors
  setSystemColors: (colors: Partial<SystemColors>) => void
  interfaceSettings: {
    buttonRadius: string
    buttonHoverStyle: string
    fontColorBase: string
    fontColorMuted: string
  }
  setInterfaceSettings: (settings: Partial<ThemeProviderState["interfaceSettings"]>) => void
}

const DEFAULT_SYSTEM_COLORS: SystemColors = {
  background: "#000000",
  surface: "#050505",
  surfaceAlt: "#101010",
  border: "#202020",
  primary: "#a3ff12",
  accent: "#7c3aed",
  textPrimary: "#ffffff",
  textMuted: "#b8b8b8",
  textOnPrimary: "#000000",
  textOnAccent: "#ffffff",
  sidebarBackground: "#000000",
  sidebarText: "#f5f5f5",
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  palette: "custom",
  setPalette: () => null,
  customPrimary: DEFAULT_SYSTEM_COLORS.primary,
  customAccent: DEFAULT_SYSTEM_COLORS.accent,
  setCustomColors: () => null,
  systemColors: DEFAULT_SYSTEM_COLORS,
  setSystemColors: () => null,
  interfaceSettings: {
    buttonRadius: "0.5rem",
    buttonHoverStyle: "glow",
    fontColorBase: DEFAULT_SYSTEM_COLORS.textPrimary,
    fontColorMuted: DEFAULT_SYSTEM_COLORS.textMuted,
  },
  setInterfaceSettings: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function hexToHsl(hex: string) {
  const clean = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "0 0% 0%"
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  const d = max - min

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = 60 * (((g - b) / d) % 6); break
      case g: h = 60 * ((b - r) / d + 2); break
      default: h = 60 * ((r - g) / d + 4)
    }
  }

  if (h < 0) h += 360
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function readStoredColors(): SystemColors {
  try {
    const raw = localStorage.getItem("a3-ui-system-colors")
    if (!raw) return DEFAULT_SYSTEM_COLORS
    return { ...DEFAULT_SYSTEM_COLORS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SYSTEM_COLORS
  }
}

export function ThemeProvider({ children, defaultTheme = "system", storageKey = "a3-dashboard-theme", ...props }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme)
  const [systemColors, setSystemColorsState] = useState<SystemColors>(() => readStoredColors())
  const [interfaceSettings, setInterfaceSettingsState] = useState({
    buttonRadius: localStorage.getItem("a3-ui-radius") || "0.5rem",
    buttonHoverStyle: localStorage.getItem("a3-ui-hover-style") || "glow",
    fontColorBase: readStoredColors().textPrimary,
    fontColorMuted: readStoredColors().textMuted,
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    if (theme === "system") {
      root.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    const c = systemColors
    const isDark = root.classList.contains("dark")

    // Tokens de marca: valem nos dois modos
    root.style.setProperty("--primary", hexToHsl(c.primary))
    root.style.setProperty("--primary-foreground", hexToHsl(c.textOnPrimary))
    root.style.setProperty("--accent", hexToHsl(c.accent))
    root.style.setProperty("--accent-foreground", hexToHsl(c.textOnAccent))
    root.style.setProperty("--ring", hexToHsl(c.primary))
    root.style.setProperty("--sidebar-primary", hexToHsl(c.primary))
    root.style.setProperty("--sidebar-primary-foreground", hexToHsl(c.textOnPrimary))
    root.style.setProperty("--sidebar-ring", hexToHsl(c.primary))
    root.style.setProperty("--subtitle-highlight", hexToHsl(c.primary))
    root.style.setProperty("--radius", interfaceSettings.buttonRadius)

    // Tokens de superfície: apenas no modo escuro, para não sobrepor a paleta clara do index.css
    const surfaceTokens: Record<string, string> = {
      "--background": hexToHsl(c.background),
      "--foreground": hexToHsl(c.textPrimary),
      "--card": hexToHsl(c.surface),
      "--card-foreground": hexToHsl(c.textPrimary),
      "--popover": hexToHsl(c.surface),
      "--popover-foreground": hexToHsl(c.textPrimary),
      "--secondary": hexToHsl(c.surfaceAlt),
      "--secondary-foreground": hexToHsl(c.textPrimary),
      "--muted": hexToHsl(c.surfaceAlt),
      "--muted-foreground": hexToHsl(c.textMuted),
      "--border": hexToHsl(c.border),
      "--input": hexToHsl(c.border),
      "--sidebar-background": hexToHsl(c.sidebarBackground),
      "--sidebar-foreground": hexToHsl(c.sidebarText),
      "--sidebar-accent": hexToHsl(c.surfaceAlt),
      "--sidebar-accent-foreground": hexToHsl(c.sidebarText),
      "--sidebar-border": hexToHsl(c.border),
    }

    Object.entries(surfaceTokens).forEach(([name, value]) => {
      if (isDark) root.style.setProperty(name, value)
      else root.style.removeProperty(name)
    })
  }, [systemColors, interfaceSettings.buttonRadius, theme])

  const value = useMemo(() => ({
    theme,
    setTheme: (next: Theme) => {
      localStorage.setItem(storageKey, next)
      setThemeState(next)
    },
    palette: "custom" as PaletteName,
    setPalette: (_next: PaletteName) => {
      localStorage.setItem("a3-ui-palette", "custom")
    },
    customPrimary: systemColors.primary,
    customAccent: systemColors.accent,
    setCustomColors: (primary: string, accent: string) => {
      const updated = { ...systemColors, primary, accent }
      localStorage.setItem("a3-ui-system-colors", JSON.stringify(updated))
      localStorage.setItem("a3-ui-palette", "custom")
      setSystemColorsState(updated)
    },
    systemColors,
    setSystemColors: (next: Partial<SystemColors>) => {
      setSystemColorsState(prev => {
        const updated = { ...prev, ...next }
        localStorage.setItem("a3-ui-system-colors", JSON.stringify(updated))
        localStorage.setItem("a3-ui-palette", "custom")
        return updated
      })
    },
    interfaceSettings: {
      ...interfaceSettings,
      fontColorBase: systemColors.textPrimary,
      fontColorMuted: systemColors.textMuted,
    },
    setInterfaceSettings: (next: Partial<ThemeProviderState["interfaceSettings"]>) => {
      setInterfaceSettingsState(prev => {
        const updated = { ...prev, ...next }
        if (next.buttonRadius) localStorage.setItem("a3-ui-radius", next.buttonRadius)
        if (next.buttonHoverStyle) localStorage.setItem("a3-ui-hover-style", next.buttonHoverStyle)
        return updated
      })

      const colorUpdates: Partial<SystemColors> = {}
      if (next.fontColorBase) colorUpdates.textPrimary = next.fontColorBase
      if (next.fontColorMuted) colorUpdates.textMuted = next.fontColorMuted
      if (Object.keys(colorUpdates).length) {
        setSystemColorsState(prev => {
          const updated = { ...prev, ...colorUpdates }
          localStorage.setItem("a3-ui-system-colors", JSON.stringify(updated))
          return updated
        })
      }
    }
  }), [theme, storageKey, systemColors, interfaceSettings])

  return <ThemeProviderContext.Provider {...props} value={value}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = () => useContext(ThemeProviderContext)

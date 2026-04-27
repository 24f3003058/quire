import { ref, watch } from 'vue'

export interface Settings {
  // Editor
  editorFontSize: number           // 13–20, default 15.5 (stored as ×10 = 155)
  paperWidth: 'compact' | 'default' | 'wide'
  spellCheck: boolean
  autoSaveSeconds: number          // 0 = off, 30, 60, 120

  // Document defaults
  defaultAuthor: string
  defaultAffiliation: string
  defaultOrcid: string

  // Export
  quartoPath: string
  exportFormat: 'pdf' | 'docx' | 'html'

  // Zotero
  autoScanZotero: boolean

  // AI
  claudeApiKey: string
}

const DEFAULTS: Settings = {
  editorFontSize: 155,
  paperWidth: 'default',
  spellCheck: true,
  autoSaveSeconds: 60,
  defaultAuthor: '',
  defaultAffiliation: '',
  defaultOrcid: '',
  quartoPath: 'quarto',
  exportFormat: 'pdf',
  autoScanZotero: false,
  claudeApiKey: '',
}

const PAPER_WIDTHS: Record<Settings['paperWidth'], string> = {
  compact: '560px',
  default: '660px',
  wide:    '820px',
}

function loadFromStorage(): Settings {
  try {
    const raw = localStorage.getItem('quire-settings')
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULTS }
}

function applyToDOM(s: Settings) {
  const root = document.documentElement
  root.style.setProperty('--editor-font-size', `${(s.editorFontSize / 10).toFixed(1)}px`)
  root.style.setProperty('--paper-max-width', PAPER_WIDTHS[s.paperWidth])
}

// Module-level singleton
const settings = ref<Settings>(loadFromStorage())

// Apply immediately on module load (before any component mounts)
if (typeof document !== 'undefined') applyToDOM(settings.value)

watch(settings, (s) => {
  localStorage.setItem('quire-settings', JSON.stringify(s))
  applyToDOM(s)
}, { deep: true })

export function useSettings() {
  function set<K extends keyof Settings>(key: K, val: Settings[K]) {
    settings.value = { ...settings.value, [key]: val }
  }

  function reset() {
    settings.value = { ...DEFAULTS }
  }

  return { settings, set, reset, PAPER_WIDTHS, DEFAULTS }
}

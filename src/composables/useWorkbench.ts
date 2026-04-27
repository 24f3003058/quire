import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { AnnotationWithSource } from './useAnnotations'
import { useDocument } from './useDocument'

export interface ZoteroScanResult {
  annotationsImported: number
  itemsMatched: number
  skippedNoMatch: string[]
  skippedAlreadyImported: number
}

// Module-level singletons shared across routes
const pendingInsert = ref<AnnotationWithSource | null>(null)
const dismissedIds = ref<Set<number>>(new Set())
const isScanning = ref(false)
const lastScanResult = ref<ZoteroScanResult | null>(null)
const zoteroAvailable = ref<boolean | null>(null)

const { filePath } = useDocument()

async function _persistState(): Promise<void> {
  if (!filePath.value) return
  const state = JSON.stringify({ dismissedIds: [...dismissedIds.value] })
  await invoke('save_workbench_state', { docPath: filePath.value, state }).catch(() => {})
}

export function useWorkbench() {
  async function checkZotero(): Promise<boolean> {
    const available = await invoke<boolean>('check_zotero_available')
    zoteroAvailable.value = available
    return available
  }

  async function scanZotero(): Promise<ZoteroScanResult> {
    isScanning.value = true
    try {
      const result = await invoke<ZoteroScanResult>('import_zotero_annotations')
      lastScanResult.value = result
      return result
    } finally {
      isScanning.value = false
    }
  }

  function dismiss(id: number) {
    dismissedIds.value = new Set([...dismissedIds.value, id])
    _persistState()
  }

  function undismiss(id: number) {
    const next = new Set(dismissedIds.value)
    next.delete(id)
    dismissedIds.value = next
    _persistState()
  }

  function setPendingInsert(ann: AnnotationWithSource | null) {
    pendingInsert.value = ann
  }

  async function loadState(): Promise<void> {
    if (!filePath.value) return
    try {
      const raw = await invoke<string | null>('load_workbench_state', { docPath: filePath.value })
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.dismissedIds)) {
          dismissedIds.value = new Set<number>(parsed.dismissedIds)
        }
      }
    } catch {
      dismissedIds.value = new Set()
    }
  }

  return {
    pendingInsert,
    dismissedIds,
    isScanning,
    lastScanResult,
    zoteroAvailable,
    checkZotero,
    scanZotero,
    dismiss,
    undismiss,
    setPendingInsert,
    loadState,
  }
}

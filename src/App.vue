<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
import StatusBar from './components/StatusBar.vue'
import HamburgerMenu from './components/HamburgerMenu.vue'
import CommandPalette from './components/CommandPalette.vue'
import OutlinePanel from './components/OutlinePanel.vue'
import DoiImportDialog from './components/DoiImportDialog.vue'
import BibDedupDialog from './components/BibDedupDialog.vue'
import { useDocument } from './composables/useDocument'
import { useQuire } from './composables/useQuire'
import { useFileOps } from './composables/useFileOps'
import { useSettings } from './composables/useSettings'
import { emitter } from './events'

const route = useRoute()
const router = useRouter()
const { docTitle, filePath, isDirty } = useDocument()
const { initQuire, addRecentFile } = useQuire()
useFileOps()

// ── Menu ──────────────────────────────────────────────────────────────────────

const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function handleNewDoc() {
  const doc = useDocument()
  const { settings } = useSettings()
  doc.docTitle.value = 'Untitled Document'
  doc.docAuthors.value = [{
    name:        settings.value.defaultAuthor || '',
    orcid:       settings.value.defaultOrcid || '',
    title:       '',
    affiliation: settings.value.defaultAffiliation || '',
  }]
  doc.filePath.value = null
  doc.isDirty.value = false
  emitter.emit('doc:opened', {
    path: '',
    content: `<h2>Abstract</h2><p></p><h2>1. Introduction</h2><p></p>`,
  })
  router.push('/write')
}

// ── Title config ──────────────────────────────────────────────────────────────

const titleConfig = computed(() => {
  switch (route.name) {
    case 'write':
      return { title: docTitle.value, subtitle: 'Write', exportLabel: 'Export as PDF' }
    case 'workbench':
      return { title: 'Workbench', subtitle: docTitle.value, exportLabel: null }
    case 'pdf':
      return { title: 'Popova et al. 2022', subtitle: 'PDF Viewer', exportLabel: 'Export as .bib' }
    default:
      return { title: 'Quire', subtitle: '', exportLabel: null }
  }
})

// ── Export ────────────────────────────────────────────────────────────────────

async function handleExport() {
  if (!filePath.value) {
    emitter.emit('export:error', { message: 'Save your document first (Ctrl+S) before exporting.' })
    return
  }
  emitter.emit('export:start')
  try {
    const result = await invoke<string>('run_quarto', {
      docPath: filePath.value,
      format: 'pdf',
    })
    const outputPath = result.split('Output: ')[1]?.trim() ?? ''
    emitter.emit('export:done', { outputPath })
  } catch (e) {
    emitter.emit('export:error', { message: String(e) })
  }
}

// ── Zen mode ──────────────────────────────────────────────────────────────────

const zenMode = ref(false)

function toggleZen() {
  zenMode.value = !zenMode.value
}

// ── Outline panel ─────────────────────────────────────────────────────────────

const outlineOpen = ref(false)

function toggleOutline() {
  outlineOpen.value = !outlineOpen.value
}

// ── DOI Import dialog ─────────────────────────────────────────────────────────

const doiImportOpen = ref(false)

// ── Bib dedup dialog ──────────────────────────────────────────────────────────

const bibDedupOpen = ref(false)

// ── Keyboard shortcuts (app-level) ────────────────────────────────────────────

function onKeydown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === 'n') {
    e.preventDefault()
    handleNewDoc()
  }
  if (ctrl && e.shiftKey && e.key === 'Z') {
    e.preventDefault()
    toggleZen()
  }
  if (e.key === 'Escape') {
    if (zenMode.value) { zenMode.value = false; return }
    if (menuOpen.value) { menuOpen.value = false; return }
    if (outlineOpen.value) { outlineOpen.value = false; return }
  }
}

// ── Event bus listeners ───────────────────────────────────────────────────────

function mountEventListeners() {
  emitter.on('cmd:new-doc', handleNewDoc)
  emitter.on('cmd:export', handleExport)
  emitter.on('cmd:toggle-zen', toggleZen)
  emitter.on('cmd:doi-import', () => { doiImportOpen.value = true })
  emitter.on('cmd:bib-dedup', () => { bibDedupOpen.value = true })
}

function unmountEventListeners() {
  emitter.off('cmd:new-doc', handleNewDoc)
  emitter.off('cmd:export', handleExport)
  emitter.off('cmd:toggle-zen', toggleZen)
}

// ── Recent files tracking ─────────────────────────────────────────────────────

emitter.on('doc:saved', ({ path }) => {
  addRecentFile(path, docTitle.value)
})
emitter.on('doc:opened', ({ path }) => {
  if (path) addRecentFile(path, docTitle.value)
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await initQuire()
  window.addEventListener('keydown', onKeydown)
  mountEventListeners()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  unmountEventListeners()
  emitter.off('doc:saved')
  emitter.off('doc:opened')
})
</script>

<template>
  <div class="app-shell" :class="{ 'app-zen': zenMode }">
    <TitleBar
      class="app-titlebar"
      :title="titleConfig.title"
      :subtitle="titleConfig.subtitle"
      :export-label="titleConfig.exportLabel"
      :is-dirty="isDirty"
      :on-export="handleExport"
      @toggle-menu="toggleMenu"
    />

    <HamburgerMenu
      v-if="menuOpen"
      @close="menuOpen = false"
      @new-doc="handleNewDoc"
    />

    <div class="app-body">
      <Sidebar
        class="app-sidebar"
        :outline-open="outlineOpen"
        @toggle-outline="toggleOutline"
      />
      <main class="main-content">
        <RouterView />
      </main>
    </div>
    <StatusBar class="app-statusbar" />

    <!-- Outline panel -->
    <OutlinePanel
      v-if="outlineOpen"
      @close="outlineOpen = false"
    />

    <!-- Command palette -->
    <CommandPalette />

    <!-- DOI import dialog -->
    <DoiImportDialog
      v-if="doiImportOpen"
      @close="doiImportOpen = false"
    />

    <!-- Bibliography dedup dialog -->
    <BibDedupDialog
      v-if="bibDedupOpen"
      @close="bibDedupOpen = false"
    />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── Zen mode: hide all chrome ───────────────────────────────────────────────── */

.app-zen .app-titlebar { display: none; }
.app-zen .app-sidebar  { display: none; }
.app-zen .app-statusbar { display: none; }
</style>

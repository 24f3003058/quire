<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useDocument } from '../composables/useDocument'
import { emitter } from '../events'

const { docHeadings, citations } = useDocument()
const router = useRouter()

const visible = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

interface PaletteItem {
  id: string
  label: string
  sub: string
  category: 'action' | 'navigate' | 'cite'
  shortcut?: string
  symbol: string
}

const STATIC: PaletteItem[] = [
  { id: 'new-doc',       label: 'New Document',                  sub: 'Start a blank document',           category: 'action', shortcut: 'Ctrl+N',       symbol: '+' },
  { id: 'open-file',     label: 'Open File',                     sub: 'Open a .qmd file from disk',       category: 'action', shortcut: 'Ctrl+O',       symbol: '↑' },
  { id: 'save',          label: 'Save',                          sub: 'Save the current document',        category: 'action', shortcut: 'Ctrl+S',       symbol: '↓' },
  { id: 'export',        label: 'Export as PDF',                 sub: 'Render via Quarto CLI',            category: 'action',                           symbol: '↗' },
  { id: 'toggle-focus',  label: 'Toggle Focus Mode',             sub: 'Fade text above cursor',           category: 'action', shortcut: 'F11',          symbol: '◎' },
  { id: 'toggle-zen',    label: 'Toggle Zen Mode',               sub: 'Hide all chrome',                  category: 'action', shortcut: 'Ctrl+Shift+Z', symbol: '⬛' },
  { id: 'section-ref',   label: 'Insert Section Reference',      sub: 'Type [[ to cross-reference',      category: 'action',                           symbol: '§'  },
  { id: 'doi-import',    label: 'Import by DOI / arXiv / ISBN',  sub: 'Fetch and add to bibliography',   category: 'action',                           symbol: '⊕' },
  { id: 'ai-panel',      label: 'AI Writing Assistant',          sub: 'Claude-powered suggestions',       category: 'action',                           symbol: '✦' },
  { id: 'bib-dedup',     label: 'Find Duplicate References',     sub: 'Scan bibliography for duplicates', category: 'action',                           symbol: '⚡' },
]

const allItems = computed<PaletteItem[]>(() => {
  const items: PaletteItem[] = [...STATIC]

  for (const h of docHeadings.value) {
    if (!h.text) continue
    items.push({
      id: `nav:${h.id}`,
      label: h.text,
      sub: 'heading',
      category: 'navigate',
      symbol: '§',
    })
  }

  for (const c of citations.value) {
    const authorPart = (c.authors ?? '').split(/[,&]/)[0].trim().split(/\s+/).pop() ?? c.key
    items.push({
      id: `cite:${c.key}`,
      label: `${authorPart}${c.year ? ' ' + c.year : ''}`,
      sub: c.title ?? c.key,
      category: 'cite',
      symbol: '¶',
    })
  }

  return items
})

const filtered = computed<PaletteItem[]>(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return allItems.value.slice(0, 20)
  return allItems.value.filter(item =>
    item.label.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q)
  ).slice(0, 20)
})

const grouped = computed(() => {
  const groups: { label: string; items: PaletteItem[] }[] = []
  const cats: Array<PaletteItem['category']> = ['action', 'navigate', 'cite']
  const labels: Record<string, string> = { action: 'Actions', navigate: 'Navigate to Section', cite: 'Insert Citation' }
  for (const cat of cats) {
    const items = filtered.value.filter(i => i.category === cat)
    if (items.length) groups.push({ label: labels[cat], items })
  }
  return groups
})

watch(query, () => { selectedIndex.value = 0 })

function open() {
  visible.value = true
  query.value = ''
  selectedIndex.value = 0
  nextTick(() => inputRef.value?.focus())
}

function close() {
  visible.value = false
}

function execute(item: PaletteItem) {
  close()
  if (item.id === 'new-doc') { emitter.emit('cmd:new-doc') }
  else if (item.id === 'open-file') { emitter.emit('cmd:open-file') }
  else if (item.id === 'save') { emitter.emit('cmd:save') }
  else if (item.id === 'export') { emitter.emit('cmd:export') }
  else if (item.id === 'toggle-focus') { emitter.emit('cmd:toggle-focus') }
  else if (item.id === 'toggle-zen') { emitter.emit('cmd:toggle-zen') }
  else if (item.id === 'section-ref') { emitter.emit('cmd:section-ref') }
  else if (item.id === 'doi-import') { emitter.emit('cmd:doi-import') }
  else if (item.id === 'ai-panel') { emitter.emit('cmd:ai-panel', {}) }
  else if (item.id === 'bib-dedup') { emitter.emit('cmd:bib-dedup') }
  else if (item.id.startsWith('nav:')) {
    router.push('/write')
    nextTick(() => emitter.emit('cmd:navigate-heading', { headingId: item.id.slice(4) }))
  }
  else if (item.id.startsWith('cite:')) {
    router.push('/write')
    nextTick(() => emitter.emit('cmd:insert-cite', { citeKey: item.id.slice(5) }))
  }
}

function scrollSelected() {
  nextTick(() => {
    const el = listRef.value?.querySelector('.pal-item--active') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === 'k') { e.preventDefault(); visible.value ? close() : open(); return }
  if (!visible.value) return
  if (e.key === 'Escape') { e.preventDefault(); close(); return }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filtered.value.length - 1)
    scrollSelected()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
    scrollSelected()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filtered.value[selectedIndex.value]
    if (item) execute(item)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="pal-fade">
      <div v-if="visible" class="pal-backdrop" @mousedown.self="close">
        <div class="pal-shell" role="dialog" aria-modal="true" aria-label="Command Palette">

          <!-- Search row -->
          <div class="pal-search-row">
            <svg class="pal-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <circle cx="6" cy="6" r="4.5"/>
              <line x1="9.5" y1="9.5" x2="13" y2="13"/>
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              class="pal-input"
              placeholder="Search commands, headings, citations…"
              spellcheck="false"
              autocomplete="off"
            />
            <kbd class="pal-esc-hint">ESC</kbd>
          </div>

          <!-- Results list -->
          <div class="pal-list" ref="listRef">
            <template v-for="group in grouped" :key="group.label">
              <div class="pal-group-label">{{ group.label }}</div>
              <button
                v-for="item in group.items"
                :key="item.id"
                class="pal-item"
                :class="{ 'pal-item--active': filtered.indexOf(item) === selectedIndex }"
                @mouseenter="selectedIndex = filtered.indexOf(item)"
                @mousedown.prevent="execute(item)"
              >
                <span class="pal-symbol">{{ item.symbol }}</span>
                <span class="pal-item-body">
                  <span class="pal-item-label">{{ item.label }}</span>
                  <span v-if="item.sub" class="pal-item-sub">{{ item.sub }}</span>
                </span>
                <kbd v-if="item.shortcut" class="pal-shortcut">{{ item.shortcut }}</kbd>
              </button>
            </template>

            <div v-if="filtered.length === 0" class="pal-empty">
              No results for "<em>{{ query }}</em>"
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* not scoped — teleported to body */

.pal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
}

.pal-shell {
  width: 100%;
  max-width: 560px;
  background: rgba(252, 251, 249, 0.98);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22), 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

.pal-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  flex-shrink: 0;
}

.pal-search-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.pal-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-family: var(--font-ui);
  font-size: 15px;
  color: var(--text);
  min-width: 0;
}

.pal-input::placeholder {
  color: var(--text-tertiary);
}

.pal-esc-hint {
  flex-shrink: 0;
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-chrome);
  border: 1px solid var(--border-medium);
  border-radius: 4px;
  padding: 2px 6px;
  letter-spacing: 0.03em;
}

.pal-list {
  overflow-y: auto;
  padding: 6px 0 8px;
}

.pal-group-label {
  padding: 8px 16px 3px;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
}

.pal-group-label:not(:first-child) {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  margin-top: 4px;
  padding-top: 10px;
}

.pal-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  border-radius: 0;
  transition: background 0.1s;
}

.pal-item--active {
  background: rgba(10, 95, 191, 0.07);
}

.pal-symbol {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-chrome);
  border: 1px solid var(--border-medium);
  border-radius: 5px;
  flex-shrink: 0;
  font-family: var(--font-mono);
}

.pal-item--active .pal-symbol {
  background: var(--accent-soft);
  border-color: rgba(10, 95, 191, 0.2);
  color: var(--accent);
}

.pal-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pal-item-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pal-item-sub {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pal-shortcut {
  flex-shrink: 0;
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: var(--bg-chrome);
  border: 1px solid var(--border-medium);
  border-radius: 4px;
  padding: 2px 6px;
}

.pal-empty {
  padding: 20px 16px;
  font-size: 13px;
  color: var(--text-tertiary);
  text-align: center;
}

/* Transition */
.pal-fade-enter-active,
.pal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.pal-fade-enter-active .pal-shell,
.pal-fade-leave-active .pal-shell {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.pal-fade-enter-from,
.pal-fade-leave-to {
  opacity: 0;
}
.pal-fade-enter-from .pal-shell,
.pal-fade-leave-to .pal-shell {
  opacity: 0;
  transform: scale(0.96) translateY(-8px);
}
</style>

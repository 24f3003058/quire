<script setup lang="ts">
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useDocument, type BibEntry } from '../composables/useDocument'

const emit = defineEmits<{ close: [] }>()
const { citations } = useDocument()

// ── State ──────────────────────────────────────────────────────────────────────

const identifier = ref('')
const fetching = ref(false)
const fetchError = ref('')
const result = ref<FetchedMeta | null>(null)
const saving = ref(false)
const saveSuccess = ref(false)

interface FetchedMeta {
  title?: string
  authors?: string
  year?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  doi?: string
  issn?: string
  publisher?: string
  url?: string
  abstractText?: string
  booktitle?: string
  isbn?: string
  entryType?: string
}

// ── Identifier detection ───────────────────────────────────────────────────────

function stripDoiUrl(s: string) {
  return s.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').trim()
}

function detectType(s: string): 'doi' | 'arxiv' | 'isbn' {
  const clean = stripDoiUrl(s.trim())
  if (/^10\.\d{4}/.test(clean)) return 'doi'
  if (/^(arXiv:|arxiv:)?\d{4}\.\d{4,5}(v\d+)?$/i.test(clean)) return 'arxiv'
  if (/^(arXiv:|arxiv:)?[a-z-]+\/\d+$/i.test(clean)) return 'arxiv'
  const digits = clean.replace(/[^0-9Xx]/g, '')
  if (digits.length === 10 || digits.length === 13) return 'isbn'
  return 'doi'
}

const idType = computed(() => {
  const id = identifier.value.trim()
  if (!id) return null
  return detectType(id)
})

const idTypeLabel = computed(() => {
  if (!idType.value) return ''
  return { doi: 'DOI', arxiv: 'arXiv', isbn: 'ISBN' }[idType.value]
})

// ── Fetch ──────────────────────────────────────────────────────────────────────

async function fetchMeta() {
  const id = identifier.value.trim()
  if (!id) return
  fetching.value = true
  fetchError.value = ''
  result.value = null
  saveSuccess.value = false
  try {
    const type = detectType(id)
    if (type === 'doi') {
      result.value = await invoke<FetchedMeta>('fetch_doi_metadata', { doi: id })
    } else if (type === 'arxiv') {
      result.value = await invoke<FetchedMeta>('fetch_arxiv_metadata', { arxivId: id })
    } else {
      result.value = await invoke<FetchedMeta>('fetch_isbn_metadata', { isbn: id })
    }
  } catch (e) {
    fetchError.value = String(e)
  } finally {
    fetching.value = false
  }
}

// ── Generate cite key ──────────────────────────────────────────────────────────

function makeCiteKey(meta: FetchedMeta): string {
  const firstAuthor = (meta.authors ?? '').split(/[,&]| and /i)[0].trim()
  const lastName = firstAuthor.split(/\s+/).pop() ?? firstAuthor
  const clean = lastName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const year = meta.year ?? ''
  const base = clean && year ? `${clean}${year}` : clean || `ref${Date.now()}`
  // Deduplicate
  if (!citations.value.find(c => c.key === base)) return base
  for (let i = 2; i < 20; i++) {
    const candidate = `${base}${String.fromCharCode(96 + i)}`
    if (!citations.value.find(c => c.key === candidate)) return candidate
  }
  return `${base}_${Date.now()}`
}

// ── Serialise to .bib ──────────────────────────────────────────────────────────

function toBibString(key: string, meta: FetchedMeta): string {
  const type = meta.entryType ?? (meta.isbn ? 'book' : meta.booktitle ? 'inproceedings' : 'article')
  const lines = [`@${type}{${key},`]
  if (meta.title)        lines.push(`  title     = {${meta.title}},`)
  if (meta.authors)      lines.push(`  author    = {${meta.authors}},`)
  if (meta.year)         lines.push(`  year      = {${meta.year}},`)
  if (meta.journal)      lines.push(`  journal   = {${meta.journal}},`)
  if (meta.booktitle)    lines.push(`  booktitle = {${meta.booktitle}},`)
  if (meta.volume)       lines.push(`  volume    = {${meta.volume}},`)
  if (meta.issue)        lines.push(`  number    = {${meta.issue}},`)
  if (meta.pages)        lines.push(`  pages     = {${meta.pages}},`)
  if (meta.publisher)    lines.push(`  publisher = {${meta.publisher}},`)
  if (meta.doi)          lines.push(`  doi       = {${meta.doi}},`)
  if (meta.isbn)         lines.push(`  isbn      = {${meta.isbn}},`)
  if (meta.issn)         lines.push(`  issn      = {${meta.issn}},`)
  if (meta.url)          lines.push(`  url       = {${meta.url}},`)
  if (meta.abstractText) lines.push(`  abstract  = {${meta.abstractText.replace(/[{}]/g, '')}},`)
  lines.push('}')
  return lines.join('\n')
}

// ── Save to bibliography ───────────────────────────────────────────────────────

async function addToBib() {
  if (!result.value) return
  saving.value = true
  try {
    const key = makeCiteKey(result.value)
    const meta = result.value

    // Add to in-memory citations
    const entry: BibEntry = {
      key,
      entryType: meta.entryType ?? 'article',
      title: meta.title,
      authors: meta.authors,
      year: meta.year,
      journal: meta.journal,
      doi: meta.doi,
      abstractText: meta.abstractText,
      url: meta.url,
      volume: meta.volume,
      issue: meta.issue,
      pages: meta.pages,
      publisher: meta.publisher,
      booktitle: meta.booktitle,
      isbn: meta.isbn,
      issn: meta.issn,
    }
    citations.value = [...citations.value, entry]

    // Append to global .bib file
    const existing: string = await invoke('get_global_bib_raw')
    const newEntry = toBibString(key, meta)
    await invoke('save_global_bib', { content: `${existing.trimEnd()}\n\n${newEntry}\n` })

    saveSuccess.value = true
    result.value = null
    identifier.value = ''
  } catch (e) {
    fetchError.value = String(e)
  } finally {
    saving.value = false
  }
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter' && !result.value && identifier.value.trim()) fetchMeta()
}
</script>

<template>
  <Teleport to="body">
    <div class="doi-backdrop" @click="onBackdropClick" @keydown="onKeydown">
      <div class="doi-sheet" role="dialog" aria-label="Import by identifier">

        <!-- Header -->
        <div class="doi-header">
          <div class="doi-header-text">
            <span class="doi-title">Import Reference</span>
            <span class="doi-subtitle">DOI, arXiv ID, or ISBN</span>
          </div>
          <button class="doi-close" @click="emit('close')" title="Close">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
              <line x1="1" y1="1" x2="12" y2="12"/><line x1="12" y1="1" x2="1" y2="12"/>
            </svg>
          </button>
        </div>

        <!-- Input -->
        <div class="doi-body">
          <div class="doi-input-row">
            <div class="doi-input-wrap">
              <input
                v-model="identifier"
                class="doi-input"
                placeholder="10.1038/s41586-020-2649-2  ·  2103.00020  ·  978-0-13-110362-7"
                spellcheck="false"
                autocomplete="off"
                autofocus
                @keydown.enter.prevent="fetchMeta"
              />
              <span v-if="idType" class="doi-type-badge">{{ idTypeLabel }}</span>
            </div>
            <button
              class="doi-fetch-btn"
              :disabled="!identifier.trim() || fetching"
              @click="fetchMeta"
            >{{ fetching ? '…' : 'Fetch' }}</button>
          </div>

          <!-- Error -->
          <p v-if="fetchError" class="doi-error">{{ fetchError }}</p>

          <!-- Success message -->
          <div v-if="saveSuccess" class="doi-success">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="2,7 6,11 12,3"/>
            </svg>
            Added to your bibliography. Type <kbd>@</kbd> in the editor to use it.
          </div>

          <!-- Preview card -->
          <div v-if="result" class="doi-preview">
            <div class="doi-preview-header">
              <span class="doi-preview-source">Fetched metadata</span>
            </div>
            <div class="doi-preview-body">
              <p class="doi-preview-title">{{ result.title ?? '(no title)' }}</p>
              <p class="doi-preview-authors">{{ result.authors }}{{ result.year ? ' · ' + result.year : '' }}</p>
              <p v-if="result.journal" class="doi-preview-meta">{{ result.journal }}{{ result.volume ? ' ' + result.volume : '' }}</p>
              <p v-if="result.doi" class="doi-preview-doi">{{ result.doi }}</p>
            </div>
            <div class="doi-preview-actions">
              <button class="doi-add-btn" :disabled="saving" @click="addToBib">
                {{ saving ? 'Adding…' : '+ Add to Bibliography' }}
              </button>
              <button class="doi-dismiss-btn" @click="result = null">Dismiss</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.doi-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.doi-sheet {
  background: var(--surface-solid);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 520px;
  overflow: hidden;
  animation: sheetIn 0.18s cubic-bezier(0.34, 1.15, 0.64, 1);
}

@keyframes sheetIn {
  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.doi-header {
  display: flex;
  align-items: center;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
}

.doi-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.doi-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.doi-subtitle {
  font-size: 11px;
  color: var(--text-tertiary);
}

.doi-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: background var(--t), color var(--t);
}
.doi-close:hover {
  background: var(--bg-chrome-active);
  color: var(--text);
}

.doi-body {
  padding: 18px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doi-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.doi-input-wrap {
  flex: 1;
  position: relative;
}

.doi-input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color var(--t), box-shadow var(--t);
}

.doi-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2.5px var(--accent-soft);
}

.doi-type-badge {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 3px;
  padding: 2px 5px;
  pointer-events: none;
}

.doi-fetch-btn {
  height: 36px;
  padding: 0 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity var(--t);
}
.doi-fetch-btn:hover:not(:disabled) { opacity: 0.88; }
.doi-fetch-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.doi-error {
  font-size: 12px;
  color: var(--accent-orange);
  line-height: 1.4;
}

.doi-success {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--accent-green);
  background: rgba(22, 150, 63, 0.07);
  border: 1px solid rgba(22, 150, 63, 0.2);
  border-radius: var(--radius);
  padding: 10px 12px;
}

.doi-success kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  background: rgba(22, 150, 63, 0.1);
  border: 1px solid rgba(22, 150, 63, 0.2);
  border-radius: 3px;
  padding: 1px 4px;
}

.doi-preview {
  border: 1px solid var(--border-medium);
  border-radius: var(--radius);
  overflow: hidden;
}

.doi-preview-header {
  padding: 7px 12px;
  background: var(--bg-chrome);
  border-bottom: 1px solid var(--border);
}

.doi-preview-source {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.doi-preview-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.doi-preview-title {
  font-family: var(--font-doc);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.doi-preview-authors {
  font-size: 12px;
  color: var(--text-secondary);
}

.doi-preview-meta {
  font-size: 11.5px;
  color: var(--text-tertiary);
}

.doi-preview-doi {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
}

.doi-preview-actions {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg-chrome);
}

.doi-add-btn {
  height: 30px;
  padding: 0 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--t);
}
.doi-add-btn:hover:not(:disabled) { opacity: 0.88; }
.doi-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.doi-dismiss-btn {
  height: 30px;
  padding: 0 12px;
  background: none;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--t);
}
.doi-dismiss-btn:hover { background: var(--bg-chrome-active); }
</style>

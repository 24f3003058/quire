<script setup lang="ts">
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useLibrary, type ItemInput } from '../composables/useLibrary'

interface FetchedMetadata {
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

const emit = defineEmits<{
  close: []
  added: [key: string]
}>()

const { createItem, loadItems } = useLibrary()

const inputText = ref('')
const isLoading = ref(false)
const fetchError = ref<string | null>(null)
const result = ref<FetchedMetadata | null>(null)
const citeKey = ref('')
const entryType = ref('article')
const addMsg = ref<string | null>(null)
const addError = ref<string | null>(null)

const ENTRY_TYPES = ['article', 'book', 'inproceedings', 'techreport', 'misc']

const detectedSource = computed(() => {
  const s = inputText.value.trim().toLowerCase()
  if (!s) return ''
  if (s.includes('arxiv.org') || s.startsWith('arxiv:') || /^\d{4}\.\d{4,}/.test(s)) return 'arXiv preprint'
  if (s.startsWith('10.') || s.includes('doi.org')) return 'CrossRef / DataCite'
  if (/^(978|979)?\d{9}[\dx]$/i.test(s.replace(/[-\s]/g, ''))) return 'ISBN → OpenLibrary'
  if (s.startsWith('http')) return 'Web page (citation meta-tags)'
  return ''
})

function makeKey(authors?: string, year?: string): string {
  const firstBlock = (authors ?? 'unknown').split(' and ')[0]
  const lastName = firstBlock.split(',')[0].trim().split(' ').pop() ?? 'unknown'
  const yr = year ?? 'xxxx'
  return (lastName + yr).toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function translate() {
  if (!inputText.value.trim()) return
  fetchError.value = null
  result.value = null
  addMsg.value = null
  addError.value = null
  isLoading.value = true
  try {
    const data = await invoke<FetchedMetadata>('translate_url', { input: inputText.value.trim() })
    result.value = data
    entryType.value = data.entryType || 'article'
    citeKey.value = makeKey(data.authors, data.year)
  } catch (e) {
    fetchError.value = String(e)
  } finally {
    isLoading.value = false
  }
}

async function addToLibrary() {
  if (!result.value || !citeKey.value) return
  addMsg.value = null
  addError.value = null
  const input: ItemInput = {
    key: citeKey.value,
    entryType: entryType.value,
    title:     result.value.title,
    authors:   result.value.authors,
    year:      result.value.year,
    journal:   result.value.journal,
    doi:       result.value.doi,
    abstractText: result.value.abstractText,
    url:       result.value.url,
    volume:    result.value.volume,
    issue:     result.value.issue,
    pages:     result.value.pages,
    publisher: result.value.publisher,
    booktitle: result.value.booktitle,
    isbn:      result.value.isbn,
    issn:      result.value.issn,
  }
  try {
    await createItem(input)
    await loadItems()
    addMsg.value = `Added [${citeKey.value}] to library`
    emit('added', citeKey.value)
    setTimeout(() => {
      result.value = null
      inputText.value = ''
      addMsg.value = null
      citeKey.value = ''
    }, 1800)
  } catch (e) {
    addError.value = String(e)
  }
}

function clear() {
  inputText.value = ''
  result.value = null
  fetchError.value = null
  addMsg.value = null
  addError.value = null
  citeKey.value = ''
}
</script>

<template>
  <div class="tp-backdrop" @click.self="$emit('close')">
    <div class="tp-panel">

      <!-- Header -->
      <div class="tp-header">
        <div class="tp-title">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="6.5"/>
            <path d="M8 5v3l2 2"/>
          </svg>
          Add from URL / DOI / arXiv / ISBN
        </div>
        <button class="tp-close" @click="$emit('close')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </button>
      </div>

      <!-- Input row -->
      <div class="tp-input-area">
        <div class="tp-input-row">
          <input
            v-model="inputText"
            class="tp-input"
            placeholder="10.1016/j.foodcont.2022  ·  2301.04567  ·  978…  ·  https://…"
            @keydown.enter="translate"
            @keydown.escape="$emit('close')"
            autofocus
          />
          <button class="btn-fetch" :disabled="!inputText.trim() || isLoading" @click="translate">
            <svg v-if="isLoading" class="spin" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 1v2M6 9v2M1 6H3M9 6h2M2.5 2.5l1.4 1.4M8.1 8.1l1.4 1.4M2.5 9.5l1.4-1.4M8.1 3.9l1.4-1.4" stroke-linecap="round"/>
            </svg>
            {{ isLoading ? 'Fetching…' : 'Fetch' }}
          </button>
        </div>
        <div class="tp-hint">
          <template v-if="detectedSource">
            <span class="tp-source">→ {{ detectedSource }}</span>
          </template>
          <template v-else>
            Accepts: DOI · arXiv ID · ISBN · any web URL (Springer, Nature, PubMed, ScienceDirect…)
          </template>
        </div>
      </div>

      <!-- Error -->
      <div v-if="fetchError" class="tp-error">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="6" cy="6" r="5"/><line x1="6" y1="4" x2="6" y2="6.5"/><circle cx="6" cy="8.5" r="0.5" fill="currentColor"/>
        </svg>
        {{ fetchError }}
      </div>

      <!-- Preview card -->
      <template v-if="result">
        <div class="tp-preview">
          <div class="preview-type-badge">@{{ entryType }}</div>
          <div class="preview-title">{{ result.title || '(no title extracted)' }}</div>
          <div class="preview-authors" v-if="result.authors">{{ result.authors }}</div>
          <div class="preview-sub">
            <span v-if="result.year">{{ result.year }}</span>
            <span v-if="result.journal" class="preview-sep">·</span>
            <span v-if="result.journal">{{ result.journal }}</span>
            <span v-if="result.volume" class="preview-sep">·</span>
            <span v-if="result.volume">vol.&nbsp;{{ result.volume }}</span>
            <span v-if="result.pages" class="preview-sep">pp.&nbsp;{{ result.pages }}</span>
          </div>
          <div class="preview-doi" v-if="result.doi">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M5 7a3 3 0 0 0 4.243.003L10.95 5.3A3 3 0 0 0 6.71 1.06l-1.06 1.06"/>
              <path d="M7 5a3 3 0 0 0-4.243-.003L1.05 6.7A3 3 0 0 0 5.29 10.94l1.06-1.06"/>
            </svg>
            {{ result.doi }}
          </div>
          <div class="preview-abstract" v-if="result.abstractText">
            {{ result.abstractText.slice(0, 240) }}{{ result.abstractText.length > 240 ? '…' : '' }}
          </div>
        </div>

        <!-- Cite key + type row -->
        <div class="tp-key-row">
          <div class="tp-key-group">
            <label class="tp-key-label">Cite key</label>
            <input v-model="citeKey" class="tp-key-input" spellcheck="false" placeholder="e.g. popova2022" />
          </div>
          <div class="tp-type-group">
            <label class="tp-key-label">Entry type</label>
            <select v-model="entryType" class="tp-type-select">
              <option v-for="t in ENTRY_TYPES" :key="t" :value="t">@{{ t }}</option>
            </select>
          </div>
        </div>

        <!-- Add button -->
        <div class="tp-add-row">
          <button class="btn-add" :disabled="!citeKey.trim()" @click="addToLibrary">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
            </svg>
            Add to Library
          </button>
          <button class="btn-clear" @click="clear">Clear</button>
          <span v-if="addMsg" class="tp-success">{{ addMsg }}</span>
          <span v-if="addError" class="tp-add-error">{{ addError }}</span>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
.tp-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tp-panel {
  background: var(--surface-solid);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 560px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.tp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tp-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
}

.tp-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t), color var(--t);
}

.tp-close:hover { background: var(--bg-chrome-active); color: var(--text); }

/* ── Input area ── */
.tp-input-area {
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tp-input-row {
  display: flex;
  gap: 8px;
}

.tp-input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color var(--t);
}

.tp-input:focus { border-color: var(--accent); background: var(--surface-solid); }

.btn-fetch {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity var(--t);
  flex-shrink: 0;
}

.btn-fetch:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-fetch:not(:disabled):hover { opacity: 0.85; }

.tp-hint {
  margin-top: 7px;
  font-size: 11.5px;
  color: var(--text-tertiary);
}

.tp-source {
  color: var(--accent);
  font-weight: 500;
}

/* ── Error ── */
.tp-error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 12px 18px;
  padding: 10px 12px;
  background: rgba(232, 101, 10, 0.07);
  border: 1px solid rgba(232, 101, 10, 0.18);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: var(--accent-orange);
  line-height: 1.45;
}

/* ── Preview ── */
.tp-preview {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.preview-type-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  align-self: flex-start;
  margin-bottom: 2px;
}

.preview-title {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
  font-family: var(--font-doc);
}

.preview-authors {
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-sub {
  font-size: 11.5px;
  color: var(--text-tertiary);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.preview-sep { opacity: 0.5; }

.preview-doi {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--accent);
  margin-top: 2px;
}

.preview-abstract {
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  font-style: italic;
  border-top: 1px solid var(--border);
  padding-top: 8px;
  margin-top: 4px;
}

/* ── Cite key row ── */
.tp-key-row {
  display: flex;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  align-items: flex-end;
}

.tp-key-group { flex: 1; }
.tp-type-group { flex-shrink: 0; }

.tp-key-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.tp-key-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color var(--t);
}

.tp-key-input:focus { border-color: var(--accent); }

.tp-type-select {
  padding: 7px 10px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  cursor: pointer;
  transition: border-color var(--t);
  appearance: auto;
}

.tp-type-select:focus { border-color: var(--accent); }

/* ── Add row ── */
.tp-add-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  flex-wrap: wrap;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--t);
}

.btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-add:not(:disabled):hover { opacity: 0.85; }

.btn-clear {
  padding: 8px 14px;
  background: none;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--t);
}

.btn-clear:hover { background: var(--bg-chrome-active); }

.tp-success {
  font-size: 12.5px;
  color: var(--accent-green);
  font-weight: 500;
}

.tp-add-error {
  font-size: 12px;
  color: var(--accent-orange);
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }
</style>

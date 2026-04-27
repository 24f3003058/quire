<script setup lang="ts">
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useDocument } from '../composables/useDocument'

const emit = defineEmits<{ close: [] }>()
const { citations } = useDocument()

// ── Duplicate detection ────────────────────────────────────────────────────────

interface DupGroup {
  reason: string
  entries: typeof citations.value
}

const dupGroups = computed<DupGroup[]>(() => {
  const groups: DupGroup[] = []

  // Group by DOI (normalised, non-empty)
  const byDoi = new Map<string, typeof citations.value>()
  for (const c of citations.value) {
    const doi = (c.doi ?? '').toLowerCase().trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    if (!doi) continue
    if (!byDoi.has(doi)) byDoi.set(doi, [])
    byDoi.get(doi)!.push(c)
  }
  for (const [doi, entries] of byDoi) {
    if (entries.length > 1) {
      groups.push({ reason: `Duplicate DOI: ${doi}`, entries })
    }
  }

  // Group by normalised title (only if no DOI match already covers them)
  const doiDuplicateKeys = new Set(groups.flatMap(g => g.entries.map(e => e.key)))
  const byTitle = new Map<string, typeof citations.value>()
  for (const c of citations.value) {
    if (doiDuplicateKeys.has(c.key)) continue
    const title = (c.title ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
    if (!title) continue
    if (!byTitle.has(title)) byTitle.set(title, [])
    byTitle.get(title)!.push(c)
  }
  for (const [, entries] of byTitle) {
    if (entries.length > 1) {
      groups.push({ reason: 'Identical titles', entries })
    }
  }

  return groups
})

const totalDups = computed(() => dupGroups.value.reduce((n, g) => n + g.entries.length - 1, 0))

// ── Remove an entry ────────────────────────────────────────────────────────────

const removing = ref<string | null>(null)
const saveError = ref('')

async function removeEntry(key: string) {
  removing.value = key
  saveError.value = ''
  try {
    // Remove from in-memory citations
    citations.value = citations.value.filter(c => c.key !== key)
    // Rewrite the .bib file: get raw, filter out the entry, save
    const raw: string = await invoke('get_global_bib_raw')
    const cleaned = removeBibEntry(raw, key)
    await invoke('save_global_bib', { content: cleaned })
  } catch (e) {
    saveError.value = String(e)
  } finally {
    removing.value = null
  }
}

function removeBibEntry(bib: string, key: string): string {
  // Remove the @type{key, ... } block for the given key
  const regex = new RegExp(`@[a-zA-Z]+\\{\\s*${escapeRegex(key)}\\s*,[^@]*?(?=@|$)`, 'gs')
  return bib.replace(regex, '').replace(/\n{3,}/g, '\n\n')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="dedup-backdrop" @click="onBackdrop">
      <div class="dedup-sheet" role="dialog" aria-label="Find duplicate references">

        <!-- Header -->
        <div class="dedup-header">
          <div class="dedup-header-text">
            <span class="dedup-title">Bibliography Duplicates</span>
            <span class="dedup-subtitle">
              {{ dupGroups.length === 0 ? 'No duplicates found' : `${totalDups} potential duplicate${totalDups !== 1 ? 's' : ''} in ${dupGroups.length} group${dupGroups.length !== 1 ? 's' : ''}` }}
            </span>
          </div>
          <button class="dedup-close" @click="emit('close')" title="Close">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
              <line x1="1" y1="1" x2="12" y2="12"/><line x1="12" y1="1" x2="1" y2="12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="dedup-body">

          <!-- All clear -->
          <div v-if="dupGroups.length === 0" class="dedup-clear">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="16" cy="16" r="13"/>
              <polyline points="10,16 14,20 22,12"/>
            </svg>
            <p>Your bibliography looks clean — no duplicate DOIs or titles found.</p>
            <p class="dedup-clear-sub">{{ citations.length }} source{{ citations.length !== 1 ? 's' : '' }} scanned.</p>
          </div>

          <!-- Error -->
          <div v-if="saveError" class="dedup-error">{{ saveError }}</div>

          <!-- Duplicate groups -->
          <div v-for="(group, gi) in dupGroups" :key="gi" class="dedup-group">
            <div class="dedup-group-reason">{{ group.reason }}</div>
            <div v-for="entry in group.entries" :key="entry.key" class="dedup-entry">
              <div class="dedup-entry-body">
                <span class="dedup-entry-key">{{ entry.key }}</span>
                <span class="dedup-entry-title">{{ entry.title ?? '(no title)' }}</span>
                <span class="dedup-entry-meta">{{ entry.authors ? entry.authors.split(/[,&]/)[0].trim() : '' }}{{ entry.year ? ' · ' + entry.year : '' }}{{ entry.journal ? ' · ' + entry.journal : '' }}</span>
              </div>
              <button
                class="dedup-remove-btn"
                :disabled="removing === entry.key"
                @click="removeEntry(entry.key)"
                title="Remove this entry from bibliography"
              >
                {{ removing === entry.key ? '…' : 'Remove' }}
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="dedup-footer">
          <span class="dedup-footer-note">Removing an entry deletes it from <code>~/.quire/references.bib</code> and the current session.</span>
          <button class="dedup-done-btn" @click="emit('close')">Done</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dedup-backdrop {
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

.dedup-sheet {
  background: var(--surface-solid);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 580px;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: sheetIn 0.18s cubic-bezier(0.34, 1.15, 0.64, 1);
}

@keyframes sheetIn {
  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.dedup-header {
  display: flex;
  align-items: center;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.dedup-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dedup-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.dedup-subtitle {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.dedup-close {
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
.dedup-close:hover {
  background: var(--bg-chrome-active);
  color: var(--text);
}

.dedup-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dedup-clear {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px;
  color: var(--accent-green);
  text-align: center;
}

.dedup-clear p {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 320px;
  line-height: 1.5;
}

.dedup-clear-sub {
  font-size: 12px;
  color: var(--text-tertiary) !important;
}

.dedup-error {
  font-size: 12px;
  color: var(--accent-orange);
  background: rgba(232, 101, 10, 0.07);
  border: 1px solid rgba(232, 101, 10, 0.2);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.dedup-group {
  border: 1px solid var(--border-medium);
  border-radius: var(--radius);
  overflow: hidden;
}

.dedup-group-reason {
  padding: 7px 12px;
  background: var(--bg-chrome);
  border-bottom: 1px solid var(--border);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--accent-orange);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dedup-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  transition: background var(--t);
}

.dedup-entry:last-child { border-bottom: none; }
.dedup-entry:hover { background: var(--bg); }

.dedup-entry-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dedup-entry-key {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--accent);
  font-weight: 500;
}

.dedup-entry-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dedup-entry-meta {
  font-size: 11px;
  color: var(--text-tertiary);
}

.dedup-remove-btn {
  flex-shrink: 0;
  height: 26px;
  padding: 0 10px;
  background: none;
  border: 1px solid rgba(200, 50, 50, 0.25);
  border-radius: var(--radius-sm);
  font-size: 11.5px;
  font-weight: 500;
  color: #C83232;
  cursor: pointer;
  transition: background var(--t), border-color var(--t);
}
.dedup-remove-btn:hover:not(:disabled) {
  background: rgba(200, 50, 50, 0.06);
  border-color: rgba(200, 50, 50, 0.4);
}
.dedup-remove-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.dedup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px 14px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.dedup-footer-note {
  font-size: 10.5px;
  color: var(--text-tertiary);
  flex: 1;
  line-height: 1.45;
}

.dedup-footer-note code {
  font-family: var(--font-mono);
  font-size: 10px;
  background: var(--bg-chrome);
  border: 1px solid var(--border-medium);
  border-radius: 3px;
  padding: 1px 4px;
}

.dedup-done-btn {
  flex-shrink: 0;
  height: 30px;
  padding: 0 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--t);
}
.dedup-done-btn:hover { opacity: 0.88; }
</style>

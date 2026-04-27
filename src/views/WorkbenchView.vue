<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAllAnnotations, type AnnotationWithSource } from '../composables/useAnnotations'
import { useWorkbench } from '../composables/useWorkbench'
import { useDocument } from '../composables/useDocument'

const router = useRouter()
const { allAnnotations, allAnnotationsLoading, loadAll } = useAllAnnotations()
const {
  dismissedIds, isScanning, lastScanResult, zoteroAvailable,
  checkZotero, scanZotero, dismiss, undismiss, setPendingInsert, loadState,
} = useWorkbench()
const { docHeadings, filePath } = useDocument()

const showDismissed = ref(false)
const scanError = ref<string | null>(null)

watch(filePath, async (p) => { if (p) await loadState() }, { immediate: true })

onMounted(async () => {
  await Promise.all([checkZotero(), loadAll()])
})

interface SourceGroup {
  key: string
  title: string
  authors: string
  year: string
  annotations: AnnotationWithSource[]
}

const groupedAnnotations = computed<SourceGroup[]>(() => {
  const visible = allAnnotations.value.filter(
    a => showDismissed.value || !dismissedIds.value.has(a.id),
  )
  const groups = new Map<string, SourceGroup>()
  for (const ann of visible) {
    if (!groups.has(ann.itemKey)) {
      groups.set(ann.itemKey, {
        key: ann.itemKey,
        title: ann.itemTitle || ann.itemKey,
        authors: ann.itemAuthors || '',
        year: ann.itemYear || '',
        annotations: [],
      })
    }
    groups.get(ann.itemKey)!.annotations.push(ann)
  }
  return [...groups.values()]
})

const dismissedCount = computed(
  () => allAnnotations.value.filter(a => dismissedIds.value.has(a.id)).length,
)

const totalCount = computed(() => allAnnotations.value.length)

async function doScan() {
  scanError.value = null
  try {
    await scanZotero()
    await loadAll()
  } catch (e) {
    scanError.value = String(e)
  }
}

function sendToDraft(ann: AnnotationWithSource) {
  setPendingInsert(ann)
  router.push('/write')
}

function truncate(text: string, len: number) {
  if (text.length <= len) return text
  return text.slice(0, len) + '…'
}

function authorShort(authors: string): string {
  if (!authors) return ''
  const first = authors.split(/[,;&]|and\s/i)[0].trim()
  const last = first.split(/\s+/).pop() ?? first
  return last
}
</script>

<template>
  <div class="workbench">

    <!-- Banner -->
    <div class="wb-banner">
      <div class="wb-banner-left">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 4L6.5 1L12 4L6.5 7L1 4Z"/>
          <path d="M1 7.5L6.5 10.5L12 7.5"/>
          <path d="M1 10.5L6.5 13.5L12 10.5"/>
        </svg>
        <span v-if="allAnnotationsLoading">Loading…</span>
        <span v-else-if="totalCount === 0">No annotations yet</span>
        <span v-else>
          <strong>{{ totalCount }} annotation{{ totalCount === 1 ? '' : 's' }}</strong>
          from {{ groupedAnnotations.length + (showDismissed ? 0 : dismissedCount > 0 ? 0 : 0) }} source{{ groupedAnnotations.length === 1 ? '' : 's' }}
        </span>
        <span v-if="lastScanResult" class="scan-result">
          — {{ lastScanResult.annotationsImported }} new
          <template v-if="lastScanResult.skippedNoMatch.length > 0">
            · {{ lastScanResult.skippedNoMatch.length }} unmatched
          </template>
        </span>
        <span v-if="scanError" class="scan-error">{{ scanError }}</span>
      </div>
      <div class="wb-banner-right">
        <button
          v-if="dismissedCount > 0"
          class="btn-ghost btn-xs"
          @click="showDismissed = !showDismissed"
        >
          {{ showDismissed ? 'Hide' : 'Show' }} dismissed ({{ dismissedCount }})
        </button>
        <button
          class="btn-scan"
          :disabled="isScanning || zoteroAvailable === false"
          :title="zoteroAvailable === false ? 'Zotero database not found' : 'Import highlights from Zotero'"
          @click="doScan"
        >
          <svg v-if="isScanning" class="spin" width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5.5 1v2M5.5 8v2M1 5.5H3M8 5.5h2M2.3 2.3l1.4 1.4M7.3 7.3l1.4 1.4M2.3 8.7l1.4-1.4M7.3 3.7l1.4-1.4" stroke-linecap="round"/>
          </svg>
          <svg v-else width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M5.5 1.5v8M1.5 5.5l4-4 4 4"/>
          </svg>
          {{ isScanning ? 'Scanning…' : 'Scan Zotero' }}
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="wb-body">

      <!-- Annotation column -->
      <div class="ann-col">
        <div class="col-label">Annotations</div>

        <!-- Empty state -->
        <div v-if="!allAnnotationsLoading && totalCount === 0" class="empty-state">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.3" opacity="0.35">
            <rect x="4" y="4" width="20" height="20" rx="3"/>
            <line x1="9" y1="10" x2="19" y2="10"/>
            <line x1="9" y1="14" x2="16" y2="14"/>
            <line x1="9" y1="18" x2="13" y2="18"/>
          </svg>
          <p>No annotations yet.</p>
          <p class="empty-sub">Click <strong>Scan Zotero</strong> to import highlights from your Zotero library.</p>
        </div>

        <!-- Grouped annotation cards -->
        <div v-else class="ann-scroll">
          <template v-for="group in groupedAnnotations" :key="group.key">
            <div class="source-header">
              <span class="source-title">{{ truncate(group.title, 52) }}</span>
              <span class="source-meta">{{ authorShort(group.authors) }}{{ group.year ? ' ' + group.year : '' }} · {{ group.annotations.length }}</span>
            </div>
            <div class="ann-grid">
              <div
                v-for="ann in group.annotations"
                :key="ann.id"
                class="ann-card"
                :class="{ dismissed: dismissedIds.has(ann.id) }"
                :style="{ borderLeftColor: ann.color }"
              >
                <div class="ann-text">{{ truncate(ann.selectedText || '', 160) }}</div>
                <div class="ann-source-row">
                  <span class="ann-page" :style="{ color: ann.color }">p.&nbsp;{{ ann.page }}</span>
                  <span v-if="ann.noteText" class="ann-note">{{ truncate(ann.noteText, 80) }}</span>
                </div>
                <div class="ann-actions">
                  <button
                    class="btn-draft"
                    title="Insert as blockquote in document"
                    @click="sendToDraft(ann)"
                  >
                    → Draft
                  </button>
                  <button
                    v-if="!dismissedIds.has(ann.id)"
                    class="btn-dismiss"
                    title="Dismiss"
                    @click="dismiss(ann.id)"
                  >
                    ×
                  </button>
                  <button
                    v-else
                    class="btn-undismiss"
                    title="Restore"
                    @click="undismiss(ann.id)"
                  >
                    ↩
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Outline column -->
      <div class="outline-col">
        <div class="col-label">Draft Outline</div>

        <div v-if="docHeadings.length === 0" class="outline-empty">
          <span>Open a document to see its structure here.</span>
        </div>

        <div v-else class="outline-list">
          <div
            v-for="(h, i) in docHeadings"
            :key="i"
            class="outline-row"
            :class="`h${h.level}`"
          >
            <div class="out-status">
              <div v-if="h.level === 1" class="status-dot-h1"></div>
              <div v-else-if="h.level === 2" class="status-dot-h2"></div>
              <div v-else class="status-dot-h3"></div>
            </div>
            <span class="out-title" :class="{ 'out-sub': h.level > 1 }">{{ h.text }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Banner ── */
.wb-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 14px;
  background: rgba(10, 95, 191, 0.05);
  border-bottom: 1px solid rgba(10, 95, 191, 0.1);
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.wb-banner svg {
  color: var(--accent);
  flex-shrink: 0;
}

.wb-banner strong {
  color: var(--text);
  font-weight: 600;
}

.wb-banner-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.wb-banner-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.scan-result {
  color: var(--accent);
  font-size: 11px;
}

.scan-error {
  color: var(--accent-orange);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.btn-scan {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--t);
}

.btn-scan:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-scan:not(:disabled):hover { opacity: 0.85; }

.btn-ghost {
  background: none;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 3px 8px;
  transition: background var(--t), color var(--t);
}

.btn-ghost:hover {
  background: var(--bg-chrome-active);
  color: var(--text);
}

.btn-xs { font-size: 10.5px; padding: 2px 6px; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }

/* ── Body ── */
.wb-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Annotation column ── */
.ann-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
  min-width: 0;
}

.col-label {
  padding: 10px 18px 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 13px;
  padding: 32px 24px;
  text-align: center;
}

.empty-state svg { margin-bottom: 4px; }
.empty-state p { margin: 0; }
.empty-sub { font-size: 12px; color: var(--text-tertiary); }
.empty-sub strong { color: var(--text-secondary); }

.ann-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 16px 16px;
}

.source-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 2px 5px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 7px;
}

.source-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.source-meta {
  font-size: 10.5px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.ann-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin-bottom: 6px;
}

.ann-card {
  background: var(--surface-solid);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  border-left-width: 3px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  box-shadow: var(--shadow-xs);
  transition: box-shadow var(--t), transform var(--t), opacity var(--t);
}

.ann-card:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.ann-card.dismissed {
  opacity: 0.45;
}

.ann-text {
  font-size: 12px;
  color: var(--text);
  line-height: 1.45;
  font-family: var(--font-doc);
  font-style: italic;
}

.ann-source-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.ann-page {
  font-size: 10.5px;
  font-weight: 700;
  flex-shrink: 0;
}

.ann-note {
  font-size: 10.5px;
  color: var(--text-tertiary);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ann-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}

.btn-draft {
  flex: 1;
  background: var(--accent-soft, rgba(10,95,191,0.07));
  border: 1px solid rgba(10, 95, 191, 0.18);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-size: 10.5px;
  font-weight: 600;
  padding: 4px 8px;
  cursor: pointer;
  transition: background var(--t), border-color var(--t);
  white-space: nowrap;
}

.btn-draft:hover {
  background: rgba(10, 95, 191, 0.14);
  border-color: rgba(10, 95, 191, 0.3);
}

.btn-dismiss,
.btn-undismiss {
  background: none;
  border: 1px solid transparent;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background var(--t), color var(--t), border-color var(--t);
  flex-shrink: 0;
}

.btn-dismiss:hover {
  background: rgba(232, 101, 10, 0.1);
  border-color: rgba(232, 101, 10, 0.2);
  color: var(--accent-orange);
}

.btn-undismiss:hover {
  background: var(--accent-soft, rgba(10,95,191,0.07));
  border-color: rgba(10, 95, 191, 0.2);
  color: var(--accent);
}

/* ── Outline column ── */
.outline-col {
  width: 260px;
  flex-shrink: 0;
  background: var(--bg-chrome);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.outline-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.outline-list {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  flex: 1;
}

.outline-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  cursor: default;
  transition: background var(--t);
}

.outline-row:hover { background: var(--bg-chrome-active); }

.outline-row.h2 { padding-left: 20px; }
.outline-row.h3 { padding-left: 32px; }

.out-status {
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-dot-h1 {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.6;
}

.status-dot-h2 {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.status-dot-h3 {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  border: 1.5px solid var(--border-medium);
}

.out-title {
  font-size: 12.5px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.out-sub {
  font-size: 11.5px;
  color: var(--text-secondary);
}
</style>

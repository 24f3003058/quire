<script setup lang="ts">
interface Annotation {
  id: number
  source: string
  page: string
  color: string
  stat: string
  statLabel: string
  note: string
}

interface OutlineSection {
  id: number
  title: string
  status: 'done' | 'in-progress' | 'draft' | 'empty'
  words: number
}

const annotations: Annotation[] = [
  {
    id: 1,
    source: 'Popova et al. 2022',
    page: 'p. 847',
    color: '#0A5FBF',
    stat: '34%',
    statLabel: 'non-compliance rate across 14 countries',
    note: 'Key baseline for RQ2. Pre-pandemic. Cross-check with FSSAI methodology.',
  },
  {
    id: 2,
    source: 'Popova et al. 2022',
    page: 'p. 312',
    color: '#0A5FBF',
    stat: '#1',
    statLabel: 'peanut — highest non-compliance category',
    note: 'Supports focus on peanut/tree nut subset in methods section.',
  },
  {
    id: 3,
    source: 'FDA 2021',
    page: '§3.2',
    color: '#C95708',
    stat: '1 in 8',
    statLabel: 'consumers affected by labelling failures',
    note: 'Consumer survey n=12,400, not clinical data. Worth footnoting.',
  },
  {
    id: 4,
    source: 'FDA 2021',
    page: '§2.1',
    color: '#C95708',
    stat: '24 mo',
    statLabel: 'surveillance period studied',
    note: 'Defines scope. Good for methodology comparison with our cross-sectional design.',
  },
  {
    id: 5,
    source: 'Hadley & King 2019',
    page: 'p. 4',
    color: '#16963F',
    stat: '2019',
    statLabel: 'baseline cohort for PAL comprehension',
    note: 'Foundational paper for lit review. PAL interpretation varies by education level.',
  },
  {
    id: 6,
    source: 'Hadley & King 2019',
    page: 'p. 11',
    color: '#16963F',
    stat: '67%',
    statLabel: '"may contain" misinterpretation rate',
    note: 'Directly applicable to our FSSAI policy recommendations section.',
  },
  {
    id: 7,
    source: 'FSSAI 2023',
    page: '§4.2.1',
    color: '#6D28D9',
    stat: '10 mg/kg',
    statLabel: 'allergen declaration threshold',
    note: 'Regulatory baseline. Verify on FSSAI website — may have been updated.',
  },
]

const outline: OutlineSection[] = [
  { id: 1, title: 'Abstract', status: 'done', words: 187 },
  { id: 2, title: '1. Introduction', status: 'done', words: 412 },
  { id: 3, title: '2. Literature Review', status: 'in-progress', words: 634 },
  { id: 4, title: '3. Methods', status: 'in-progress', words: 298 },
  { id: 5, title: '4. Results', status: 'draft', words: 185 },
  { id: 6, title: '5. Discussion', status: 'empty', words: 0 },
  { id: 7, title: '6. Conclusion', status: 'empty', words: 0 },
]
</script>

<template>
  <div class="workbench">
    <!-- Banner -->
    <div class="wb-banner">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 4L6.5 1L12 4L6.5 7L1 4Z"/>
        <path d="M1 7.5L6.5 10.5L12 7.5"/>
        <path d="M1 10.5L6.5 13.5L12 10.5"/>
      </svg>
      <span><strong>7 annotations</strong> imported from 4 sources — Allergen Labelling Study</span>
    </div>

    <!-- Body: annotations + outline -->
    <div class="wb-body">
      <!-- Left: annotation blocks -->
      <div class="ann-col">
        <div class="col-label">Annotations</div>
        <div class="ann-list">
          <div
            v-for="ann in annotations"
            :key="ann.id"
            class="ann-card"
            :style="{ borderLeftColor: ann.color }"
          >
            <div class="ann-top-row">
              <span class="ann-stat" :style="{ color: ann.color }">{{ ann.stat }}</span>
              <span class="ann-drag-handle" title="Drag to outline">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                  <circle cx="3.5" cy="2.5" r="1"/>
                  <circle cx="7.5" cy="2.5" r="1"/>
                  <circle cx="3.5" cy="5.5" r="1"/>
                  <circle cx="7.5" cy="5.5" r="1"/>
                  <circle cx="3.5" cy="8.5" r="1"/>
                  <circle cx="7.5" cy="8.5" r="1"/>
                </svg>
              </span>
            </div>
            <div class="ann-stat-label">{{ ann.statLabel }}</div>
            <div class="ann-source-row">
              <span class="ann-source-name" :style="{ color: ann.color }">{{ ann.source }}</span>
              <span class="ann-page">{{ ann.page }}</span>
            </div>
            <div class="ann-note-text">{{ ann.note }}</div>
          </div>
        </div>
      </div>

      <!-- Right: draft outline -->
      <div class="outline-col">
        <div class="col-label">Draft Outline</div>
        <div class="outline-list">
          <div v-for="sec in outline" :key="sec.id" class="outline-row">
            <!-- Status icon -->
            <div class="out-status">
              <template v-if="sec.status === 'done'">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#16963F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 6.5l3 3 6-6"/>
                </svg>
              </template>
              <template v-else-if="sec.status === 'in-progress'">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#C95708" stroke-width="1.5">
                  <circle cx="6" cy="6" r="4.5"/>
                  <path d="M6 3.5V6l1.5 1.5" stroke-linecap="round"/>
                </svg>
              </template>
              <template v-else-if="sec.status === 'draft'">
                <div class="status-dot-filled"></div>
              </template>
              <template v-else>
                <div class="status-dot-empty"></div>
              </template>
            </div>

            <!-- Title + word count -->
            <div class="out-text">
              <span class="out-title" :class="{ 'out-empty': sec.status === 'empty' }">{{ sec.title }}</span>
              <span v-if="sec.words > 0" class="out-words">{{ sec.words }}w</span>
            </div>

            <!-- Pull annotation button -->
            <button class="out-pull" title="Pull annotation here">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <line x1="5.5" y1="1" x2="5.5" y2="10"/>
                <line x1="1" y1="5.5" x2="10" y2="5.5"/>
              </svg>
            </button>
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

.wb-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 18px;
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

.wb-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Annotation column */
.ann-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
  min-width: 0;
}

/* Outline column */
.outline-col {
  width: 260px;
  flex-shrink: 0;
  background: var(--bg-chrome);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.ann-list {
  padding: 14px 18px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 9px;
  align-content: start;
  flex: 1;
}

.ann-card {
  background: var(--surface-solid);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  border-left-width: 3px;
  padding: 11px 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: var(--shadow-xs);
  transition: box-shadow var(--t), transform var(--t);
  cursor: default;
}

.ann-card:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.ann-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.ann-stat {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  font-family: var(--font-ui);
}

.ann-drag-handle {
  color: var(--text-tertiary);
  cursor: grab;
  padding: 2px;
  opacity: 0;
  transition: opacity var(--t);
}

.ann-card:hover .ann-drag-handle {
  opacity: 1;
}

.ann-stat-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.35;
}

.ann-source-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ann-source-name {
  font-size: 10px;
  font-weight: 700;
}

.ann-page {
  font-size: 10px;
  color: var(--text-tertiary);
}

.ann-note-text {
  font-size: 11px;
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.45;
  padding-top: 5px;
  border-top: 1px solid var(--border);
  margin-top: 2px;
}

/* Outline */
.outline-list {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  flex: 1;
}

.outline-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  transition: background var(--t);
  cursor: pointer;
}

.outline-row:hover {
  background: var(--bg-chrome-active);
}

.out-status {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-dot-filled {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.status-dot-empty {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid var(--border-medium);
}

.out-text {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  overflow: hidden;
  min-width: 0;
}

.out-title {
  font-size: 12.5px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.out-empty {
  color: var(--text-tertiary);
}

.out-words {
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.out-pull {
  background: none;
  border: 1px solid transparent;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--t), background var(--t), border-color var(--t), color var(--t);
  flex-shrink: 0;
}

.outline-row:hover .out-pull {
  opacity: 1;
}

.out-pull:hover {
  background: var(--accent-soft);
  border-color: rgba(10, 95, 191, 0.2);
  color: var(--accent);
}
</style>

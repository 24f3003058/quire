<script setup lang="ts">
import { ref } from 'vue'

const currentPage = ref(3)
const totalPages = 18

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
function nextPage() {
  if (currentPage.value < totalPages) currentPage.value++
}

const citingDrafts = [
  { id: 1, title: 'Allergen Labelling in Packaged Foods (current)' },
  { id: 2, title: 'FSSAI Comparative Analysis — Seminar Draft' },
]

const annotations = [
  {
    id: 1,
    stat: '34%',
    statLabel: 'non-compliance rate (n=847)',
    note: 'Key baseline for RQ2.',
    page: 'p. 847',
    color: '#0A5FBF',
  },
  {
    id: 2,
    stat: '#1',
    statLabel: 'peanut — highest risk category',
    note: 'Supports our methods focus.',
    page: 'p. 312',
    color: '#0A5FBF',
  },
  {
    id: 3,
    stat: '14',
    statLabel: 'countries in sampling frame',
    note: 'Good comparative scope. Check if India included.',
    page: 'p. 6',
    color: '#0A5FBF',
  },
]
</script>

<template>
  <div class="pdf-view">
    <!-- PDF reading area -->
    <div class="pdf-area">
      <div class="pdf-page">
        <!-- Simulated page header -->
        <div class="sim-header">
          <div class="sim-line short"></div>
          <div class="sim-line xshort"></div>
        </div>

        <!-- Simulated content with a highlight block -->
        <div class="sim-content">
          <div class="sim-line full"></div>
          <div class="sim-line full"></div>
          <div class="sim-line three-quarter"></div>
          <div class="sim-line full"></div>
          <div class="sim-line half"></div>
          <div class="sim-line full"></div>
          <div class="sim-line two-third"></div>

          <!-- Highlighted section -->
          <div class="highlight-block">
            <div class="sim-line full highlighted"></div>
            <div class="sim-line three-quarter highlighted"></div>
            <div class="sim-line full highlighted"></div>
            <div class="highlight-annotation">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <path d="M1.5 1.5h9v7h-3l-1.5 2-1.5-2H1.5v-7Z"/>
              </svg>
              Your annotation: Key baseline stat for RQ2 — cross-check with FSSAI
            </div>
          </div>

          <div class="sim-line full"></div>
          <div class="sim-line three-quarter"></div>
          <div class="sim-line full"></div>
          <div class="sim-line full"></div>
          <div class="sim-line half"></div>
          <div class="sim-line full"></div>
          <div class="sim-line two-third"></div>
          <div class="sim-line full"></div>
        </div>
      </div>

      <!-- Page nav -->
      <div class="pdf-nav">
        <button class="nav-btn" @click="prevPage" :disabled="currentPage <= 1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 2L4 7l5 5"/>
          </svg>
        </button>
        <span class="page-counter">{{ currentPage }} <span class="page-of">of</span> {{ totalPages }}</span>
        <button class="nav-btn" @click="nextPage" :disabled="currentPage >= totalPages">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 2l5 5-5 5"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Right metadata panel -->
    <div class="meta-panel">
      <!-- Citing drafts -->
      <div class="meta-section">
        <div class="meta-label">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 9V5a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1Z"/>
            <path d="M4 4V3a1 1 0 011-1h2a1 1 0 011 1v1"/>
          </svg>
          Your drafts citing this paper
        </div>
        <div class="drafts-list">
          <div v-for="draft in citingDrafts" :key="draft.id" class="draft-row">
            <div class="draft-dot"></div>
            <span class="draft-title">{{ draft.title }}</span>
          </div>
        </div>
      </div>

      <!-- Your annotations -->
      <div class="meta-section">
        <div class="meta-label">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M1 2h10M1 5h10M1 8h6"/>
          </svg>
          Your annotations
        </div>
        <div class="ann-list">
          <div v-for="ann in annotations" :key="ann.id" class="ann-row" :style="{ borderLeftColor: ann.color }">
            <div class="ann-stat" :style="{ color: ann.color }">{{ ann.stat }}</div>
            <div class="ann-body">
              <div class="ann-label">{{ ann.statLabel }}</div>
              <div class="ann-note">{{ ann.note }}</div>
              <div class="ann-page">{{ ann.page }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* PDF area */
.pdf-area {
  flex: 1;
  background: #DEDAD2;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 20px 16px;
  gap: 14px;
  overflow: hidden;
  min-width: 0;
}

.pdf-page {
  flex: 1;
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  padding: 40px 44px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Simulated header */
.sim-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E0DDD7;
}

/* Simulated content */
.sim-content {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

/* Placeholder lines */
.sim-line {
  height: 9px;
  background: #ECEAE5;
  border-radius: 2px;
}
.sim-line.full        { width: 100%; }
.sim-line.three-quarter { width: 74%; }
.sim-line.two-third   { width: 65%; }
.sim-line.half        { width: 48%; }
.sim-line.short       { width: 32%; }
.sim-line.xshort      { width: 20%; }
.sim-line.highlighted {
  background: rgba(250, 204, 21, 0.45);
}

/* Highlight block */
.highlight-block {
  background: rgba(250, 204, 21, 0.1);
  border-left: 3px solid rgba(202, 138, 4, 0.55);
  padding: 10px 12px;
  border-radius: 2px 6px 6px 2px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 4px 0;
}

.highlight-annotation {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 10px;
  color: #92400E;
  font-style: italic;
  padding-top: 5px;
  border-top: 1px solid rgba(202, 138, 4, 0.25);
  line-height: 1.4;
}

.highlight-annotation svg {
  flex-shrink: 0;
  margin-top: 1px;
}

/* Page nav */
.pdf-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.nav-btn {
  background: var(--surface-solid);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background var(--t), box-shadow var(--t);
}
.nav-btn:hover:not(:disabled) {
  background: var(--bg-chrome);
  box-shadow: var(--shadow-xs);
}
.nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.page-counter {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 52px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.page-of {
  color: var(--text-tertiary);
}

/* Meta panel */
.meta-panel {
  width: 290px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  background: var(--bg-chrome);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.meta-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  min-height: 0;
}

.meta-section:last-child {
  border-bottom: none;
}

.meta-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 15px 9px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

/* Citing drafts */
.drafts-list {
  padding: 12px 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.draft-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.draft-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-top: 4px;
}

.draft-title {
  font-size: 12px;
  color: var(--text);
  line-height: 1.45;
}

/* Annotations */
.ann-list {
  padding: 10px 15px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow-y: auto;
  flex: 1;
}

.ann-row {
  background: var(--surface-solid);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  border-left-width: 2px;
  padding: 8px 10px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.ann-stat {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  flex-shrink: 0;
  padding-top: 1px;
  font-family: var(--font-ui);
}

.ann-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.ann-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.3;
}

.ann-note {
  font-size: 10.5px;
  color: var(--text-secondary);
  font-style: italic;
}

.ann-page {
  font-size: 10px;
  color: var(--text-tertiary);
}
</style>

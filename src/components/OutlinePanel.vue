<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useDocument } from '../composables/useDocument'
import { emitter } from '../events'

const { docHeadings, docTitle } = useDocument()
const router = useRouter()

const emit = defineEmits<{ close: [] }>()

const hasHeadings = computed(() => docHeadings.value.length > 0)

function navigate(headingId: string | null) {
  if (!headingId) return
  emit('close')
  if (router.currentRoute.value.name !== 'write') {
    router.push('/write').then(() => {
      setTimeout(() => emitter.emit('cmd:navigate-heading', { headingId }), 80)
    })
  } else {
    emitter.emit('cmd:navigate-heading', { headingId })
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="outline-backdrop" @mousedown.self="emit('close')">
    <div class="outline-panel">
      <!-- Header -->
      <div class="outline-header">
        <span class="outline-title">Outline</span>
        <span class="outline-doc-title">{{ docTitle }}</span>
        <button class="outline-close" @click="emit('close')" title="Close (Esc)">
          <svg width="11" height="11" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
            <line x1="1" y1="1" x2="12" y2="12"/><line x1="12" y1="1" x2="1" y2="12"/>
          </svg>
        </button>
      </div>

      <!-- Heading list -->
      <div class="outline-list">
        <div v-if="!hasHeadings" class="outline-empty">
          No headings in this document yet
        </div>
        <button
          v-for="h in docHeadings"
          :key="h.id ?? h.text"
          class="outline-item"
          :style="{ paddingLeft: `${12 + (h.level - 1) * 16}px` }"
          :class="[`outline-lv${h.level}`]"
          @click="navigate(h.id)"
        >
          <span class="outline-item-text">{{ h.text || 'Untitled' }}</span>
        </button>
      </div>

      <!-- Footer hint -->
      <div class="outline-footer">
        <span>Type <kbd>[[ </kbd> in the editor to insert a section reference</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.outline-backdrop {
  position: fixed;
  inset: 0;
  z-index: 900;
  pointer-events: none;
}

.outline-panel {
  position: absolute;
  left: calc(var(--sidebar-w) + 8px);
  top: calc(var(--titlebar-h) + 8px);
  width: 260px;
  max-height: calc(100vh - var(--titlebar-h) - var(--statusbar-h) - 20px);
  background: rgba(252, 251, 249, 0.98);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: all;
  animation: outlineIn 0.16s cubic-bezier(0.34, 1.15, 0.64, 1);
  transform-origin: top left;
}

@keyframes outlineIn {
  from { opacity: 0; transform: scale(0.94) translateY(-6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.outline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.outline-title {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.outline-doc-title {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: background var(--t), color var(--t);
}
.outline-close:hover {
  background: var(--bg-chrome-active);
  color: var(--text);
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.outline-empty {
  padding: 16px 14px;
  font-size: 12px;
  color: var(--text-tertiary);
  font-style: italic;
}

.outline-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 5px 12px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  border-radius: 0;
  transition: background 0.12s;
  padding-right: 12px;
}

.outline-item:hover {
  background: var(--accent-soft);
}

.outline-item-text {
  font-size: 12.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.12s;
}

.outline-item:hover .outline-item-text {
  color: var(--accent);
}

.outline-lv1 .outline-item-text {
  font-weight: 600;
  color: var(--text);
  font-size: 12.5px;
}

.outline-lv2 .outline-item-text {
  font-weight: 500;
  font-size: 12px;
}

.outline-lv3 .outline-item-text {
  font-size: 11.5px;
  color: var(--text-tertiary);
}

.outline-footer {
  padding: 7px 12px;
  border-top: 1px solid var(--border);
  font-size: 10.5px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.outline-footer kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  background: var(--bg-chrome);
  border: 1px solid var(--border-medium);
  border-radius: 3px;
  padding: 1px 4px;
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useDocument } from '../composables/useDocument'
import { emitter } from '../events'

const { lastSaved, isDirty } = useDocument()

const savedLabel = computed(() => {
  if (isDirty.value) return 'Unsaved'
  if (!lastSaved.value) return 'Saved'
  const diff = Math.floor((Date.now() - lastSaved.value.getTime()) / 1000)
  if (diff < 5) return 'Saved just now'
  if (diff < 60) return `Saved ${diff}s ago`
  const mins = Math.floor(diff / 60)
  return `Saved ${mins}m ago`
})

type ExportState = 'idle' | 'exporting' | 'done' | 'error'
const exportState = ref<ExportState>('idle')
const exportMessage = ref('')
let exportTimer: ReturnType<typeof setTimeout> | null = null

function setExport(state: ExportState, message: string) {
  exportState.value = state
  exportMessage.value = message
  if (exportTimer) clearTimeout(exportTimer)
  if (state === 'done' || state === 'error') {
    exportTimer = setTimeout(() => {
      exportState.value = 'idle'
      exportMessage.value = ''
    }, 5000)
  }
}

const onExportStart = () => setExport('exporting', 'Exporting PDF…')
const onExportDone = () => setExport('done', 'PDF exported')
const onExportError = ({ message }: { message: string }) => setExport('error', message)

onMounted(() => {
  emitter.on('export:start', onExportStart)
  emitter.on('export:done', onExportDone)
  emitter.on('export:error', onExportError)
})

onBeforeUnmount(() => {
  emitter.off('export:start', onExportStart)
  emitter.off('export:done', onExportDone)
  emitter.off('export:error', onExportError)
  if (exportTimer) clearTimeout(exportTimer)
})
</script>

<template>
  <footer class="statusbar">
    <div class="status-left">
      <span class="stat-item">1,847 words</span>
      <span class="stat-sep">·</span>
      <span class="stat-item">3 sources cited</span>
    </div>
    <div class="status-center">
      <Transition name="export-msg">
        <span v-if="exportState !== 'idle'" class="export-status" :class="exportState">
          <span v-if="exportState === 'exporting'" class="export-spinner"></span>
          {{ exportMessage }}
        </span>
        <span v-else class="branch-indicator">
          <span class="branch-dot"></span>
          main
        </span>
      </Transition>
    </div>
    <div class="status-right">
      <span class="stat-item" :class="{ unsaved: isDirty }">{{ savedLabel }}</span>
    </div>
  </footer>
</template>

<style scoped>
.statusbar {
  height: var(--statusbar-h);
  background: var(--bg-chrome);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.status-left, .status-center, .status-right {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stat-item {
  font-size: 10.5px;
  color: var(--text-tertiary);
  letter-spacing: -0.005em;
}

.stat-item.unsaved {
  color: var(--accent-orange);
}

.stat-sep {
  font-size: 10px;
  color: var(--text-tertiary);
  opacity: 0.5;
}

.branch-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  color: var(--text-tertiary);
}

.branch-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-green);
  flex-shrink: 0;
}

.export-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 500;
}

.export-status.exporting {
  color: var(--text-secondary);
}

.export-status.done {
  color: var(--accent-green, #1a7f4b);
}

.export-status.error {
  color: var(--accent-orange);
}

.export-spinner {
  width: 8px;
  height: 8px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.export-msg-enter-active,
.export-msg-leave-active {
  transition: opacity 0.2s ease;
}
.export-msg-enter-from,
.export-msg-leave-to {
  opacity: 0;
}
</style>

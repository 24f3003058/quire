<script setup lang="ts">
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useDocument } from '../composables/useDocument'
import { useSettings } from '../composables/useSettings'

const emit = defineEmits<{ close: [] }>()
const { citations } = useDocument()
const { settings } = useSettings()

// ── State ──────────────────────────────────────────────────────────────────────

type Mode = 'explain' | 'synthesize' | 'check'
const mode = ref<Mode>('explain')
const loading = ref(false)
const result = ref('')
const error = ref('')

// explain mode
const selectedCiteKey = ref('')

// synthesize mode
const selectedCiteKeys = ref<string[]>([])
const synthesizeTopic = ref('')

// check mode
const checkText = ref('')

const hasApiKey = computed(() => !!settings.value.claudeApiKey.trim())

const selectedCitation = computed(() =>
  citations.value.find(c => c.key === selectedCiteKey.value) ?? null
)

// ── Mode helpers ───────────────────────────────────────────────────────────────

function toggleCiteForSynth(key: string) {
  const idx = selectedCiteKeys.value.indexOf(key)
  if (idx === -1) selectedCiteKeys.value = [...selectedCiteKeys.value, key]
  else selectedCiteKeys.value = selectedCiteKeys.value.filter(k => k !== key)
}

// ── AI calls ───────────────────────────────────────────────────────────────────

async function runExplain() {
  const cite = selectedCitation.value
  if (!cite) return
  const abstract = cite.abstractText ?? ''
  const prompt = abstract
    ? `You are a research writing assistant. Here is the abstract of a paper titled "${cite.title ?? 'untitled'}" by ${cite.authors ?? 'unknown authors'} (${cite.year ?? ''}):\n\n${abstract}\n\nIn 3 clear sentences, explain: (1) what claim or finding this paper makes, (2) what evidence or method it uses, (3) why this matters for an academic reader. Be direct and specific — no hedging.`
    : `Summarize what a paper titled "${cite.title ?? 'untitled'}" by ${cite.authors ?? 'unknown authors'} (${cite.year ?? ''}) likely argues, based on the title alone. Be brief.`
  await callClaude(prompt)
}

async function runSynthesize() {
  if (!selectedCiteKeys.value.length) return
  const sources = selectedCiteKeys.value.map(k => {
    const c = citations.value.find(x => x.key === k)
    if (!c) return `[${k}]`
    return `"${c.title ?? c.key}" (${c.authors ?? ''}, ${c.year ?? ''}): ${c.abstractText ? c.abstractText.slice(0, 200) : '(no abstract)'}`
  }).join('\n\n')
  const topic = synthesizeTopic.value.trim()
  const prompt = `You are a research writing assistant. I am writing an academic paragraph${topic ? ` about ${topic}` : ''}. Here are ${selectedCiteKeys.value.length} sources:\n\n${sources}\n\nWrite 2–3 sentences that synthesise the key shared finding or argument across these sources. Use academic prose. Insert citation placeholders as [@key] after each claim. Do not invent claims not in the abstracts.`
  await callClaude(prompt)
}

async function runCheck() {
  const text = checkText.value.trim()
  if (!text) return
  const prompt = `You are a rigorous academic editor. Here is a paragraph:\n\n"${text}"\n\nIdentify each factual claim that needs a citation but does not already have one (citations appear as [1], [2], etc. or [@key]). For each unsupported claim, output a bullet: "CLAIM: <the claim>" and "WHY: <why a citation is expected>". If all claims are cited or are common knowledge, say "All claims appear to be cited." Be concise.`
  await callClaude(prompt)
}

async function callClaude(prompt: string) {
  loading.value = true
  result.value = ''
  error.value = ''
  try {
    result.value = await invoke<string>('ask_claude', {
      apiKey: settings.value.claudeApiKey,
      prompt,
    })
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

function clear() {
  result.value = ''
  error.value = ''
}
</script>

<template>
  <div class="ai-panel">
    <!-- Header -->
    <div class="ai-header">
      <div class="ai-header-left">
        <span class="ai-label">AI Assistant</span>
        <span class="ai-model">claude-haiku</span>
      </div>
      <button class="ai-close" @click="emit('close')" title="Close">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
          <line x1="1" y1="1" x2="12" y2="12"/><line x1="12" y1="1" x2="1" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- No API key warning -->
    <div v-if="!hasApiKey" class="ai-nokey">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <circle cx="9" cy="9" r="7.5"/>
        <line x1="9" y1="6" x2="9" y2="9.5"/>
        <circle cx="9" cy="12" r="0.75" fill="currentColor" stroke="none"/>
      </svg>
      <span>Add your Anthropic API key in <strong>Settings → AI</strong> to use this panel.</span>
    </div>

    <template v-else>
      <!-- Mode tabs -->
      <div class="ai-tabs">
        <button
          v-for="m in (['explain', 'synthesize', 'check'] as const)"
          :key="m"
          class="ai-tab"
          :class="{ 'ai-tab--active': mode === m }"
          @click="mode = m; clear()"
        >{{ { explain: 'Explain', synthesize: 'Synthesize', check: 'Check' }[m] }}</button>
      </div>

      <!-- Explain mode -->
      <div v-if="mode === 'explain'" class="ai-body">
        <p class="ai-mode-hint">Summarise what a citation argues in plain language.</p>
        <label class="ai-field-label">Select a citation</label>
        <select v-model="selectedCiteKey" class="ai-select">
          <option value="">— choose a source —</option>
          <option v-for="c in citations" :key="c.key" :value="c.key">
            {{ c.authors?.split(/[,&]/)[0].trim().split(/\s+/).pop() }} {{ c.year }} — {{ (c.title ?? '').slice(0, 50) }}
          </option>
        </select>
        <button
          class="ai-run-btn"
          :disabled="!selectedCiteKey || loading"
          @click="runExplain"
        >{{ loading ? 'Asking Claude…' : 'Explain this source' }}</button>
      </div>

      <!-- Synthesize mode -->
      <div v-if="mode === 'synthesize'" class="ai-body">
        <p class="ai-mode-hint">Get a synthesis sentence that weaves 2–3 sources together.</p>
        <label class="ai-field-label">Select sources (2–4)</label>
        <div class="ai-cite-chips">
          <button
            v-for="c in citations"
            :key="c.key"
            class="ai-chip"
            :class="{ 'ai-chip--on': selectedCiteKeys.includes(c.key) }"
            @click="toggleCiteForSynth(c.key)"
          >
            {{ c.authors?.split(/[,&]/)[0].trim().split(/\s+/).pop() }} {{ c.year }}
          </button>
        </div>
        <label class="ai-field-label" style="margin-top:10px">Topic (optional)</label>
        <input v-model="synthesizeTopic" class="ai-input" placeholder="e.g. allergen label compliance" />
        <button
          class="ai-run-btn"
          :disabled="selectedCiteKeys.length < 2 || loading"
          @click="runSynthesize"
        >{{ loading ? 'Asking Claude…' : `Synthesise ${selectedCiteKeys.length || ''}${selectedCiteKeys.length ? ' source' + (selectedCiteKeys.length > 1 ? 's' : '') : ' sources'}` }}</button>
      </div>

      <!-- Check mode -->
      <div v-if="mode === 'check'" class="ai-body">
        <p class="ai-mode-hint">Paste a paragraph to flag claims that may need citations.</p>
        <textarea
          v-model="checkText"
          class="ai-textarea"
          placeholder="Paste your paragraph here…"
          rows="5"
        ></textarea>
        <button
          class="ai-run-btn"
          :disabled="!checkText.trim() || loading"
          @click="runCheck"
        >{{ loading ? 'Asking Claude…' : 'Check for missing citations' }}</button>
      </div>

      <!-- Result -->
      <div v-if="error" class="ai-error">{{ error }}</div>
      <div v-if="result" class="ai-result">
        <div class="ai-result-header">
          <span class="ai-result-label">Claude's response</span>
          <button class="ai-result-clear" @click="clear">Clear</button>
        </div>
        <div class="ai-result-body">{{ result }}</div>
      </div>

      <!-- Loading shimmer -->
      <div v-if="loading" class="ai-loading">
        <div class="ai-loading-dot"></div>
        <div class="ai-loading-dot"></div>
        <div class="ai-loading-dot"></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ai-panel {
  width: 320px;
  flex-shrink: 0;
  border-left: 3px solid var(--accent-purple, #7C3AED);
  background: var(--surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.06);
}

.ai-header {
  display: flex;
  align-items: center;
  padding: 12px 16px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.ai-header-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
}

.ai-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--accent-purple, #7C3AED);
}

.ai-model {
  font-size: 10px;
  color: var(--text-tertiary);
  background: var(--bg-chrome);
  border: 1px solid var(--border-medium);
  border-radius: 3px;
  padding: 1px 5px;
}

.ai-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: background var(--t), color var(--t);
}
.ai-close:hover {
  background: var(--bg-chrome-active);
  color: var(--text);
}

.ai-nokey {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 18px;
  color: var(--text-secondary);
  text-align: center;
  font-size: 12.5px;
  line-height: 1.5;
}

.ai-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.ai-tab {
  flex: 1;
  height: 34px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--t), border-color var(--t);
}

.ai-tab--active {
  color: var(--accent-purple, #7C3AED);
  border-bottom-color: var(--accent-purple, #7C3AED);
}

.ai-body {
  padding: 14px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.ai-mode-hint {
  font-size: 11.5px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.ai-field-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

.ai-select {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  cursor: pointer;
}

.ai-cite-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.ai-chip {
  height: 26px;
  padding: 0 9px;
  border: 1px solid var(--border-medium);
  border-radius: 13px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  background: none;
  color: var(--text-secondary);
  transition: background var(--t), border-color var(--t), color var(--t);
}

.ai-chip--on {
  background: rgba(124, 58, 237, 0.08);
  border-color: rgba(124, 58, 237, 0.3);
  color: var(--accent-purple, #7C3AED);
}

.ai-input {
  width: 100%;
  height: 30px;
  padding: 0 9px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: 12.5px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  transition: border-color var(--t);
}
.ai-input:focus { border-color: var(--accent-purple, #7C3AED); }

.ai-textarea {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-family: var(--font-doc);
  font-size: 12.5px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  resize: none;
  line-height: 1.5;
  transition: border-color var(--t);
}
.ai-textarea:focus { border-color: var(--accent-purple, #7C3AED); }

.ai-run-btn {
  align-self: flex-start;
  height: 30px;
  padding: 0 14px;
  background: var(--accent-purple, #7C3AED);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--t);
  margin-top: 4px;
}
.ai-run-btn:hover:not(:disabled) { opacity: 0.88; }
.ai-run-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.ai-error {
  margin: 0 14px;
  font-size: 12px;
  color: var(--accent-orange);
  background: rgba(232, 101, 10, 0.07);
  border: 1px solid rgba(232, 101, 10, 0.2);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  line-height: 1.4;
}

.ai-result {
  flex: 1;
  margin: 0 0 12px;
  border-top: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 6px;
  flex-shrink: 0;
}

.ai-result-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent-purple, #7C3AED);
}

.ai-result-clear {
  background: none;
  border: none;
  font-size: 11px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background var(--t), color var(--t);
}
.ai-result-clear:hover {
  background: var(--bg-chrome-active);
  color: var(--text-secondary);
}

.ai-result-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 14px 14px;
  font-family: var(--font-doc);
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.ai-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px;
}

.ai-loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-purple, #7C3AED);
  opacity: 0.4;
  animation: aiPulse 1.2s ease-in-out infinite;
}

.ai-loading-dot:nth-child(2) { animation-delay: 0.2s; }
.ai-loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes aiPulse {
  0%, 80%, 100% { opacity: 0.4; transform: scale(1); }
  40% { opacity: 1; transform: scale(1.3); }
}
</style>

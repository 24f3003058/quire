<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useSettings } from '../composables/useSettings'
import { useWorkbench } from '../composables/useWorkbench'

const { settings, set, reset } = useSettings()
const { zoteroAvailable, checkZotero, isScanning, scanZotero, lastScanResult } = useWorkbench()

type Section = 'editor' | 'defaults' | 'bibliography' | 'zotero' | 'ai' | 'export' | 'about'
const activeSection = ref<Section>('editor')

const sections: { key: Section; label: string; icon: string }[] = [
  { key: 'editor',      label: 'Editor',      icon: 'M12 2.5L14.5 5L7 12.5H4.5V10L12 2.5Z' },
  { key: 'defaults',    label: 'Defaults',    icon: 'M8.5 2v13M3 7.5h11M3 12h11' },
  { key: 'bibliography',label: 'Bibliography', icon: 'M3 2.5h2.5v12H3z M7 2.5h2.5v12H7z M11.5 2.5l2.4.9-4.4 11.4-2.4-.9z' },
  { key: 'zotero',      label: 'Zotero',      icon: 'M1.5 5.5L8.5 2L15.5 5.5L8.5 9L1.5 5.5Z M1.5 9.5L8.5 13L15.5 9.5' },
  { key: 'ai',          label: 'AI',          icon: 'M8.5 2L11 6H14L11.5 8.5L12.5 12L8.5 9.5L4.5 12L5.5 8.5L3 6H6Z' },
  { key: 'export',      label: 'Export',      icon: 'M8.5 1.5v9M5 7l3.5 3.5L12 7 M3.5 13.5h10' },
  { key: 'about',       label: 'About',       icon: 'M8.5 7.5v5M8.5 5V4' },
]

// ── Bibliography ──────────────────────────────────────────────────────────────

const bibPath = ref<string>('')
const bibEntryCount = ref<number | null>(null)
const bibReloadMsg = ref<string | null>(null)

async function loadBibInfo() {
  try {
    const raw = await invoke<string>('get_global_bib_raw')
    const matches = (raw.match(/@[a-zA-Z]+\s*\{/g) ?? []).length
    bibEntryCount.value = matches
  } catch {}
  bibPath.value = '~/.quire/references.bib'
}

async function reloadBib() {
  bibReloadMsg.value = null
  try {
    await invoke('get_global_bib')
    bibReloadMsg.value = 'Reloaded.'
    await loadBibInfo()
    setTimeout(() => { bibReloadMsg.value = null }, 2500)
  } catch (e) {
    bibReloadMsg.value = String(e)
  }
}

// ── Zotero ────────────────────────────────────────────────────────────────────

const scanError = ref<string | null>(null)

async function doScan() {
  scanError.value = null
  try {
    await scanZotero()
  } catch (e) {
    scanError.value = String(e)
  }
}

onMounted(async () => {
  await Promise.all([loadBibInfo(), checkZotero()])
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const fontSizeDisplay = computed(() => `${(settings.value.editorFontSize / 10).toFixed(1)} px`)

function onFontSlider(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value)
  set('editorFontSize', v)
}
</script>

<template>
  <div class="settings-layout">

    <!-- Left nav -->
    <aside class="settings-nav">
      <div class="settings-nav-title">Settings</div>
      <button
        v-for="s in sections"
        :key="s.key"
        class="settings-nav-item"
        :class="{ active: activeSection === s.key }"
        @click="activeSection = s.key"
      >
        <svg width="14" height="14" viewBox="0 0 17 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path :d="s.icon"/>
        </svg>
        {{ s.label }}
      </button>
    </aside>

    <!-- Right panel -->
    <div class="settings-panel">

      <!-- ── Editor ── -->
      <template v-if="activeSection === 'editor'">
        <h2 class="section-title">Editor</h2>

        <div class="setting-group">
          <div class="setting-label">Font size</div>
          <div class="setting-desc">Body text size in the writing area.</div>
          <div class="slider-row">
            <span class="slider-bound">13 px</span>
            <input
              type="range" min="130" max="200" step="5"
              :value="settings.editorFontSize"
              @input="onFontSlider"
              class="slider"
            />
            <span class="slider-bound">20 px</span>
            <span class="slider-val">{{ fontSizeDisplay }}</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-label">Line width</div>
          <div class="setting-desc">Maximum width of the paper column.</div>
          <div class="radio-row">
            <label v-for="opt in (['compact','default','wide'] as const)" :key="opt" class="radio-opt">
              <input
                type="radio"
                :value="opt"
                :checked="settings.paperWidth === opt"
                @change="set('paperWidth', opt)"
              />
              <span class="radio-label">{{ opt.charAt(0).toUpperCase() + opt.slice(1) }}</span>
              <span class="radio-sub">{{ opt === 'compact' ? '560 px' : opt === 'default' ? '660 px' : '820 px' }}</span>
            </label>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-label">Spell check</div>
          <div class="setting-desc">Browser spell check in the editor. Applies on next open.</div>
          <label class="toggle">
            <input type="checkbox" :checked="settings.spellCheck" @change="set('spellCheck', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="toggle-label">{{ settings.spellCheck ? 'On' : 'Off' }}</span>
          </label>
        </div>

        <div class="setting-group">
          <div class="setting-label">Auto-save interval</div>
          <div class="setting-desc">Save automatically when the document has unsaved changes.</div>
          <select class="select" :value="settings.autoSaveSeconds" @change="set('autoSaveSeconds', parseInt(($event.target as HTMLSelectElement).value))">
            <option value="0">Off</option>
            <option value="30">Every 30 s</option>
            <option value="60">Every 60 s</option>
            <option value="120">Every 2 min</option>
          </select>
        </div>

        <div class="setting-group">
          <button class="btn-ghost-sm" @click="reset()">Reset all settings to defaults</button>
        </div>
      </template>

      <!-- ── Document Defaults ── -->
      <template v-if="activeSection === 'defaults'">
        <h2 class="section-title">Document Defaults</h2>
        <p class="section-desc">Pre-filled values for new documents. You can always override per-document in the metadata panel.</p>

        <div class="setting-group">
          <label class="setting-label" for="def-author">Default author name</label>
          <input id="def-author" class="text-input" type="text" placeholder="e.g. Sharma, R."
            :value="settings.defaultAuthor"
            @input="set('defaultAuthor', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="setting-group">
          <label class="setting-label" for="def-affil">Default affiliation</label>
          <input id="def-affil" class="text-input" type="text" placeholder="e.g. Food Policy Studies, IIT Madras"
            :value="settings.defaultAffiliation"
            @input="set('defaultAffiliation', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="setting-group">
          <label class="setting-label" for="def-orcid">Default ORCID</label>
          <input id="def-orcid" class="text-input" type="text" placeholder="e.g. 0000-0000-0000-0000"
            :value="settings.defaultOrcid"
            @input="set('defaultOrcid', ($event.target as HTMLInputElement).value)"
          />
          <div class="setting-desc">16-digit ORCID iD. Leave blank to omit from new documents.</div>
        </div>
      </template>

      <!-- ── Bibliography ── -->
      <template v-if="activeSection === 'bibliography'">
        <h2 class="section-title">Bibliography</h2>
        <p class="section-desc">Your bibliography is the collection of papers, books, and reports you can cite in your documents.</p>

        <!-- What is a bibliography -->
        <div class="info-card">
          <div class="info-card-icon">
            <svg width="16" height="16" viewBox="0 0 17 17" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 2.5h2.5v12H3z"/><path d="M7 2.5h2.5v12H7z"/><path d="M11.5 2.5l2.4.9-4.4 11.4-2.4-.9z"/>
            </svg>
          </div>
          <div class="info-card-body">
            <div class="info-card-title">What is this?</div>
            <div class="info-card-text">
              Quire keeps all your references in one shared file on your computer.
              When you type <strong>@</strong> in the editor, it searches this file and lets you insert citations like <strong>[1]</strong>, <strong>[2]</strong>, etc.
              You manage references through the <strong>Library</strong> view (the books icon in the sidebar).
            </div>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-label">Your reference file</div>
          <div class="setting-desc">This file on your computer holds all your saved papers and books.</div>
          <div class="path-display">
            <code class="path-code">{{ bibPath || '~/.quire/references.bib' }}</code>
            <span v-if="bibEntryCount !== null" class="path-badge">
              {{ bibEntryCount }} {{ bibEntryCount === 1 ? 'paper saved' : 'papers saved' }}
            </span>
          </div>
          <div class="action-row">
            <button class="btn-primary-sm" @click="reloadBib">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 6A5 5 0 1 0 2.5 2.5"/><path d="M1 2v3h3"/>
              </svg>
              Sync from file
            </button>
            <span v-if="bibReloadMsg" class="action-msg" :class="{ error: bibReloadMsg.startsWith('Error') }">{{ bibReloadMsg }}</span>
          </div>
          <div class="setting-desc" style="margin-top:10px;">
            Use <strong>Sync from file</strong> only if you edited the file manually outside Quire.
            If you add references through the Library view, this is automatic.
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-label">How citations look in your document</div>
          <div class="setting-desc">
            Citations appear as numbered superscripts in your text — e.g. the sentence ends here
            <span class="cite-example">[1]</span> and a second reference would be <span class="cite-example">[2]</span>.
            The full reference list is generated on export.
          </div>
          <div class="chip-disabled" style="margin-top:10px;">Numeric [1] — currently active</div>
          <div class="setting-desc" style="margin-top:6px; font-size:11px;">Author-Year style (Popova 2022) is planned for a future version.</div>
        </div>
      </template>

      <!-- ── Zotero ── -->
      <template v-if="activeSection === 'zotero'">
        <h2 class="section-title">Zotero Integration</h2>

        <!-- What is Zotero -->
        <div class="info-card">
          <div class="info-card-icon">
            <svg width="16" height="16" viewBox="0 0 17 17" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1.5 5.5L8.5 2L15.5 5.5L8.5 9L1.5 5.5Z"/>
              <path d="M1.5 9.5L8.5 13L15.5 9.5"/>
            </svg>
          </div>
          <div class="info-card-body">
            <div class="info-card-title">What is Zotero?</div>
            <div class="info-card-text">
              Zotero is a free app researchers use to save papers and highlight text inside PDFs.
              Quire can read those highlights directly from Zotero on your computer — no login or internet needed —
              and show them in the <strong>Workbench</strong> view so you can drag them into your writing.
            </div>
          </div>
        </div>

        <!-- Status -->
        <div class="setting-group">
          <div class="setting-label">Is Zotero installed?</div>
          <div class="zotero-status-card" :class="zoteroAvailable ? 'status-ok' : 'status-warn'">
            <span class="status-dot" :class="zoteroAvailable ? 'dot-green' : 'dot-orange'"></span>
            <div class="zotero-status-text">
              <template v-if="zoteroAvailable === null">Checking…</template>
              <template v-else-if="zoteroAvailable">
                <strong>Zotero found</strong> — your highlights can be imported.
              </template>
              <template v-else>
                <strong>Zotero not found</strong> — please install Zotero and open it at least once, then come back here.
                <a class="zotero-link" href="https://www.zotero.org/download" target="_blank">Download Zotero →</a>
              </template>
            </div>
          </div>
        </div>

        <!-- Import -->
        <div class="setting-group">
          <div class="setting-label">Import your highlights</div>
          <div class="setting-desc">
            Reads all the text you have highlighted in Zotero PDFs and brings them into Quire's
            <strong>Workbench</strong> view. Papers in Quire that share the same title or DOI are matched automatically.
            Re-scanning is safe — duplicates are skipped.
          </div>
          <div class="action-row">
            <button
              class="btn-primary-sm"
              :disabled="!zoteroAvailable || isScanning"
              :title="!zoteroAvailable ? 'Install Zotero first' : ''"
              @click="doScan"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 6A5 5 0 1 0 2.5 2.5"/><path d="M1 2v3h3"/>
              </svg>
              {{ isScanning ? 'Importing highlights…' : 'Import highlights from Zotero' }}
            </button>
          </div>

          <!-- Scan result -->
          <div v-if="lastScanResult" class="scan-result-box">
            <div class="srb-row">
              <span class="srb-num">{{ lastScanResult.annotationsImported }}</span>
              <span class="srb-label">new highlights imported</span>
            </div>
            <div class="srb-row">
              <span class="srb-num">{{ lastScanResult.itemsMatched }}</span>
              <span class="srb-label">papers matched to your library</span>
            </div>
            <div class="srb-row" v-if="lastScanResult.skippedNoMatch.length">
              <span class="srb-num warn">{{ lastScanResult.skippedNoMatch.length }}</span>
              <span class="srb-label">papers skipped (not in your library yet — add them via Library view first)</span>
            </div>
          </div>
          <div v-if="scanError" class="action-msg error" style="margin-top:10px;">{{ scanError }}</div>
        </div>

        <!-- Auto scan -->
        <div class="setting-group">
          <div class="setting-label">Import automatically on startup</div>
          <div class="setting-desc">Every time you open Quire, check for new Zotero highlights and import them. Recommended once Zotero is set up.</div>
          <label class="toggle" style="margin-top:10px;">
            <input type="checkbox" :checked="settings.autoScanZotero" @change="set('autoScanZotero', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="toggle-label">{{ settings.autoScanZotero ? 'On — imports on every launch' : 'Off' }}</span>
          </label>
        </div>
      </template>

      <!-- ── AI ── -->
      <template v-if="activeSection === 'ai'">
        <h2 class="section-title">AI Writing Assistant</h2>

        <div class="setting-group">
          <label class="setting-label" for="claude-key">Anthropic API Key</label>
          <div class="setting-desc">
            Required for the AI Writing Assistant panel. Get a key at
            <a href="https://console.anthropic.com" style="color:var(--accent)">console.anthropic.com</a>.
            Stored locally in your browser — never sent anywhere except the Anthropic API.
          </div>
          <input
            id="claude-key"
            class="text-input mono"
            type="password"
            placeholder="sk-ant-api03-…"
            :value="settings.claudeApiKey"
            @input="set('claudeApiKey', ($event.target as HTMLInputElement).value)"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="setting-group">
          <div class="setting-label">Model</div>
          <div class="setting-desc">
            The assistant uses <strong>claude-haiku-4-5</strong> — fast and cost-effective for in-editor tasks.
            The model is fixed and is not configurable.
          </div>
        </div>
      </template>

      <!-- ── Export ── -->
      <template v-if="activeSection === 'export'">
        <h2 class="section-title">Export</h2>

        <div class="setting-group">
          <label class="setting-label" for="quarto-path">Quarto CLI path</label>
          <div class="setting-desc">
            Path to the <code>quarto</code> executable. Use <code>quarto</code> if it's on your system PATH,
            or provide an absolute path like <code>/usr/local/bin/quarto</code>.
          </div>
          <input id="quarto-path" class="text-input mono" type="text" placeholder="quarto"
            :value="settings.quartoPath"
            @input="set('quartoPath', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="setting-group">
          <div class="setting-label">Default export format</div>
          <div class="radio-row">
            <label v-for="fmt in (['pdf','docx','html'] as const)" :key="fmt" class="radio-opt">
              <input
                type="radio"
                :value="fmt"
                :checked="settings.exportFormat === fmt"
                @change="set('exportFormat', fmt)"
              />
              <span class="radio-label">{{ fmt.toUpperCase() }}</span>
            </label>
          </div>
          <div class="setting-desc">Quarto must be installed. PDF output also requires a LaTeX distribution (TinyTeX or TeX Live).</div>
        </div>
      </template>

      <!-- ── About ── -->
      <template v-if="activeSection === 'about'">
        <h2 class="section-title">About Quire</h2>

        <div class="about-block">
          <div class="about-logo">
            <svg width="36" height="36" viewBox="0 0 17 17" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1.5 5.5L8.5 2L15.5 5.5L8.5 9L1.5 5.5Z"/>
              <path d="M1.5 9.5L8.5 13L15.5 9.5"/>
              <path d="M1.5 12.5L8.5 16L15.5 12.5"/>
            </svg>
          </div>
          <div class="about-name">Quire</div>
          <div class="about-tagline">A writing environment for academic researchers.</div>
        </div>

        <div class="about-list">
          <div class="about-row">
            <span class="about-key">Version</span>
            <span class="about-val">0.1.0 — Milestone 0</span>
          </div>
          <div class="about-row">
            <span class="about-key">Document format</span>
            <span class="about-val">.qmd (Quarto Markdown)</span>
          </div>
          <div class="about-row">
            <span class="about-key">Bibliography</span>
            <span class="about-val">BibTeX (.bib)</span>
          </div>
          <div class="about-row">
            <span class="about-key">Editor</span>
            <span class="about-val">Tiptap / ProseMirror</span>
          </div>
          <div class="about-row">
            <span class="about-key">Shell</span>
            <span class="about-val">Tauri 2 (Rust + WebView)</span>
          </div>
          <div class="about-row">
            <span class="about-key">Built for</span>
            <span class="about-val">Allergen Labelling Study — IIT Madras</span>
          </div>
        </div>

        <div class="setting-desc" style="margin-top: 20px;">
          <em>A quire</em> is the unit of folded leaves that makes a book — the thing before the thing is bound.
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
.settings-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* ── Left nav ── */
.settings-nav {
  width: 180px;
  flex-shrink: 0;
  background: var(--bg-chrome);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 18px 0 12px;
  overflow-y: auto;
}

.settings-nav-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  padding: 0 16px 10px;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background var(--t), color var(--t);
  border-radius: 0;
}

.settings-nav-item:hover {
  background: var(--bg-chrome-active);
  color: var(--text);
}

.settings-nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

/* ── Right panel ── */
.settings-panel {
  flex: 1;
  overflow-y: auto;
  padding: 28px 36px 40px;
  min-width: 0;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.section-desc {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.55;
  margin-bottom: 24px;
}

/* ── Setting group ── */
.setting-group {
  border-bottom: 1px solid var(--border);
  padding: 18px 0;
}

.setting-group:last-child { border-bottom: none; }

.setting-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
  display: block;
}

.setting-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-top: 4px;
}

.setting-desc code {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--bg-chrome-active);
  padding: 1px 4px;
  border-radius: 3px;
}

/* ── Font slider ── */
.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.slider-bound {
  font-size: 11px;
  color: var(--text-tertiary);
  width: 36px;
  flex-shrink: 0;
  text-align: center;
}

.slider {
  flex: 1;
  accent-color: var(--accent);
  height: 4px;
  cursor: pointer;
}

.slider-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  width: 44px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* ── Radio group ── */
.radio-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.radio-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color var(--t), background var(--t);
  background: var(--surface-solid);
}

.radio-opt:has(input:checked) {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.radio-opt input[type="radio"] { display: none; }

.radio-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
}

.radio-sub {
  font-size: 10.5px;
  color: var(--text-tertiary);
}

/* ── Toggle ── */
.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  cursor: pointer;
}

.toggle input { display: none; }

.toggle-track {
  width: 34px;
  height: 20px;
  background: var(--border-medium);
  border-radius: 100px;
  position: relative;
  transition: background var(--t);
  flex-shrink: 0;
}

.toggle input:checked + .toggle-track {
  background: var(--accent);
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: transform var(--t);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle input:checked ~ .toggle-track .toggle-thumb,
.toggle-track:has(~ .toggle-thumb) .toggle-thumb {
  transform: translateX(14px);
}

/* Fix toggle thumb position when input is checked */
.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(14px);
}

.toggle-label {
  font-size: 12.5px;
  color: var(--text-secondary);
}

/* ── Select ── */
.select {
  margin-top: 10px;
  padding: 7px 12px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  outline: none;
  transition: border-color var(--t);
  appearance: auto;
}

.select:focus { border-color: var(--accent); }

/* ── Text input ── */
.text-input {
  display: block;
  margin-top: 8px;
  width: 100%;
  max-width: 380px;
  padding: 8px 12px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  background: var(--surface-solid);
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color var(--t);
}

.text-input:focus { border-color: var(--accent); }
.text-input.mono { font-family: var(--font-mono); font-size: 12.5px; }

/* ── Path display ── */
.path-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--bg-chrome);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  max-width: 420px;
}

.path-code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-badge {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

/* ── Status row ── */
.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-green { background: var(--accent-green); }
.dot-orange { background: var(--accent-orange); }

/* ── Action row ── */
.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--t);
}

.btn-primary-sm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary-sm:not(:disabled):hover { opacity: 0.85; }

.btn-ghost-sm {
  padding: 6px 14px;
  background: none;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--t), color var(--t);
}

.btn-ghost-sm:hover { background: var(--bg-chrome-active); color: var(--text); }

.action-msg {
  font-size: 12px;
  color: var(--text-secondary);
}

.action-msg.error { color: var(--accent-orange); }

/* ── Info card ── */
.info-card {
  display: flex;
  gap: 14px;
  background: var(--accent-soft);
  border: 1px solid rgba(10, 95, 191, 0.15);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 6px;
}

.info-card-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.info-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-card-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.info-card-text {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.55;
}

.info-card-text strong {
  color: var(--text);
  font-weight: 600;
}

/* ── Citation example ── */
.cite-example {
  display: inline-block;
  color: var(--accent);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  background: var(--accent-soft);
  padding: 1px 4px;
  border-radius: 3px;
}

/* ── Chip disabled ── */
.chip-disabled {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-chrome);
}

/* ── About ── */
.about-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 20px 0 24px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.about-logo {
  margin-bottom: 4px;
}

.about-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.04em;
}

.about-tagline {
  font-size: 13px;
  color: var(--text-secondary);
}

.about-list {
  display: flex;
  flex-direction: column;
}

.about-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.about-row:last-child { border-bottom: none; }

.about-key {
  width: 150px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

.about-val {
  color: var(--text);
}

/* ── Zotero status card ── */
.zotero-status-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid transparent;
}

.zotero-status-card.status-ok {
  background: rgba(52, 199, 89, 0.08);
  border-color: rgba(52, 199, 89, 0.25);
}

.zotero-status-card.status-warn {
  background: rgba(232, 101, 10, 0.07);
  border-color: rgba(232, 101, 10, 0.22);
}

.zotero-status-text {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.55;
}

.zotero-status-text strong {
  color: var(--text);
  font-weight: 600;
}

.zotero-link {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}

.zotero-link:hover { text-decoration: underline; }

/* ── Scan result box ── */
.scan-result-box {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--bg-chrome);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.srb-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.srb-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  min-width: 28px;
  text-align: right;
  flex-shrink: 0;
  line-height: 1;
}

.srb-num.warn {
  color: var(--accent-orange);
}

.srb-label {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

</style>

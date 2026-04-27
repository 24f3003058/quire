<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useSettings } from '../composables/useSettings'
import { useWorkbench } from '../composables/useWorkbench'

const { settings, set, reset } = useSettings()
const { zoteroAvailable, checkZotero, isScanning, scanZotero, lastScanResult } = useWorkbench()

type Section = 'editor' | 'defaults' | 'bibliography' | 'zotero' | 'export' | 'about'
const activeSection = ref<Section>('editor')

const sections: { key: Section; label: string; icon: string }[] = [
  { key: 'editor',      label: 'Editor',      icon: 'M12 2.5L14.5 5L7 12.5H4.5V10L12 2.5Z' },
  { key: 'defaults',    label: 'Defaults',    icon: 'M8.5 2v13M3 7.5h11M3 12h11' },
  { key: 'bibliography',label: 'Bibliography', icon: 'M3 2.5h2.5v12H3z M7 2.5h2.5v12H7z M11.5 2.5l2.4.9-4.4 11.4-2.4-.9z' },
  { key: 'zotero',      label: 'Zotero',      icon: 'M1.5 5.5L8.5 2L15.5 5.5L8.5 9L1.5 5.5Z M1.5 9.5L8.5 13L15.5 9.5' },
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

        <div class="setting-group">
          <div class="setting-label">Global bibliography file</div>
          <div class="path-display">
            <code class="path-code">{{ bibPath || '~/.quire/references.bib' }}</code>
            <span v-if="bibEntryCount !== null" class="path-badge">{{ bibEntryCount }} entries</span>
          </div>
          <div class="setting-desc">
            All projects share this file. Add entries by editing it directly or via the Library view.
            A per-project <code>.bib</code> in the same folder as your document takes precedence.
          </div>
          <div class="action-row">
            <button class="btn-primary-sm" @click="reloadBib">Reload bibliography</button>
            <span v-if="bibReloadMsg" class="action-msg" :class="{ error: bibReloadMsg.startsWith('Error') }">{{ bibReloadMsg }}</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-label">Citation style</div>
          <div class="setting-desc">Only numeric inline citations are supported in this version. CSL support is planned for M2.</div>
          <div class="chip-disabled">Numeric [1] — active</div>
        </div>
      </template>

      <!-- ── Zotero ── -->
      <template v-if="activeSection === 'zotero'">
        <h2 class="section-title">Zotero Integration</h2>
        <p class="section-desc">Quire reads Zotero's local SQLite database directly — no API key, no sync, no account.</p>

        <div class="setting-group">
          <div class="setting-label">Zotero database</div>
          <div class="status-row">
            <span class="status-dot" :class="zoteroAvailable ? 'dot-green' : 'dot-orange'"></span>
            <span>{{ zoteroAvailable === null ? 'Checking…' : zoteroAvailable ? 'Found — ready to import' : 'Not found — open Zotero to create the database' }}</span>
          </div>
          <div class="setting-desc">
            Expected location: <code>~/Zotero/zotero.sqlite</code> or <code>~/Documents/Zotero/zotero.sqlite</code>.
            Close Zotero before scanning if you get a lock error.
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-label">Import highlights</div>
          <div class="setting-desc">Reads all yellow/coloured highlights from your Zotero library and matches them to your bibliography. Duplicates are skipped automatically.</div>
          <div class="action-row">
            <button
              class="btn-primary-sm"
              :disabled="!zoteroAvailable || isScanning"
              @click="doScan"
            >{{ isScanning ? 'Scanning…' : 'Scan Zotero now' }}</button>
            <span v-if="lastScanResult" class="action-msg">
              {{ lastScanResult.annotationsImported }} imported · {{ lastScanResult.itemsMatched }} papers matched
              <template v-if="lastScanResult.skippedNoMatch.length">
                · {{ lastScanResult.skippedNoMatch.length }} unmatched
              </template>
            </span>
            <span v-if="scanError" class="action-msg error">{{ scanError }}</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="setting-label">Scan on launch</div>
          <div class="setting-desc">Automatically import new Zotero highlights every time Quire starts.</div>
          <label class="toggle">
            <input type="checkbox" :checked="settings.autoScanZotero" @change="set('autoScanZotero', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="toggle-label">{{ settings.autoScanZotero ? 'On' : 'Off' }}</span>
          </label>
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
</style>

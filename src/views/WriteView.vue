<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Citation {
  id: number
  title: string
  authors: string
  year: string
  journal: string
  doi: string
  abstract: string
  yourNotes: string
}

const citations: Citation[] = [
  {
    id: 1,
    title: 'Allergen Labelling Compliance in Food Manufacturing: A Systematic Review',
    authors: 'Popova, M., Chen, L., & Okafor, R.',
    year: '2022',
    journal: 'Food Control',
    doi: '10.1016/j.foodcont.2022.108940',
    abstract: 'A systematic review examining allergen labelling compliance across 14 countries. Of 847 products sampled, 34% showed discrepancies between declared allergens and actual ingredient lists, with peanut and tree nut labelling showing the highest non-compliance rates. The study identifies inconsistent definition of precautionary labelling as a primary driver of consumer confusion.',
    yourNotes: 'Key stat for RQ2 — cross-check with FSSAI thresholds. The 34% figure is pre-pandemic; useful as baseline. Check methodology section for sampling frame before citing directly.',
  },
  {
    id: 2,
    title: 'Food Allergen Labeling and Consumer Protection Act: Compliance Report 2021',
    authors: 'U.S. Food and Drug Administration',
    year: '2021',
    journal: 'FDA Technical Report',
    doi: 'FDA-TR-2021-0042',
    abstract: 'Annual compliance report on FALCPA implementation, documenting a 1-in-8 consumer experience with allergic reactions attributable to labelling failures in packaged foods over a 24-month surveillance period. Survey conducted across n=12,400 households with at least one member reporting a food allergy.',
    yourNotes: 'The 1-in-8 statistic is from their consumer survey (n=12,400), not clinical data. Worth footnoting. Good for introduction to establish scale of the problem.',
  },
  {
    id: 3,
    title: 'Hidden Allergens and Precautionary Labelling: Consumer Understanding and Risk',
    authors: 'Hadley, C. & King, J.',
    year: '2019',
    journal: 'J Allergy Clin Immunol',
    doi: '10.1016/j.jaci.2018.11.025',
    abstract: 'Cross-sectional study of consumer comprehension of precautionary allergen labels (PAL) across a 2019 baseline cohort. Finds significant variation in PAL interpretation by education level and prior allergy diagnosis. 67% of respondents misinterpreted "may contain" as indicating lower risk than a direct ingredient declaration.',
    yourNotes: 'Foundational paper for our literature review section. The "may contain" framing discussion is directly applicable to our FSSAI policy recommendations.',
  },
]

const tooltipVisible = ref(false)
const tooltipCitation = ref<Citation | null>(null)
const tooltipStyle = ref({ left: '0px', top: '0px' })

const panelOpen = ref(false)
const activeCitation = ref<Citation | null>(null)

let hideTimer: ReturnType<typeof setTimeout> | null = null

function showTooltip(e: MouseEvent, id: number) {
  if (panelOpen.value) return
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  tooltipStyle.value = {
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.bottom + 10}px`,
  }
  tooltipCitation.value = citations.find(c => c.id === id) ?? null
  tooltipVisible.value = true
}

function startHideTooltip() {
  hideTimer = setTimeout(() => {
    tooltipVisible.value = false
    tooltipCitation.value = null
  }, 180)
}

function cancelHideTooltip() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
}

function openPanel(id: number) {
  tooltipVisible.value = false
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  activeCitation.value = citations.find(c => c.id === id) ?? null
  panelOpen.value = true
}

function openTooltipCitation() {
  if (tooltipCitation.value) openPanel(tooltipCitation.value.id)
}

function closePanel() {
  panelOpen.value = false
  setTimeout(() => { activeCitation.value = null }, 260)
}

function goToPdf() {
  router.push('/pdf')
}
</script>

<template>
  <div class="write-layout">
    <!-- Document scrollable area -->
    <div class="document-area">
      <div class="paper">
        <!-- Paper header -->
        <div class="paper-eyebrow">Working Draft · April 2026</div>
        <h1 class="paper-title">Allergen Labelling in Packaged Foods</h1>
        <p class="paper-subtitle">A Cross-Sectional Study of FSSAI Compliance and Consumer Risk Communication</p>
        <div class="paper-byline">
          <span>Sharma, R.</span>
          <span class="by-sep">·</span>
          <span>[Author]</span>
          <span class="by-sep">·</span>
          <span>Food Policy Studies, IIT Madras</span>
        </div>
        <div class="paper-rule"></div>

        <!-- Abstract -->
        <div class="paper-section">
          <h2 class="section-head">Abstract</h2>
          <p>The inadequate labelling of allergens in packaged foods poses significant public health risks, particularly for the estimated 220–520 million people globally affected by food allergies. This cross-sectional study examines allergen labelling compliance among packaged food manufacturers in India under the Food Safety and Standards (Labelling and Display) Regulations 2020, with comparative reference to EU Regulation 1169/2011 and the US FALCPA. We find systematic gaps in precautionary labelling practice and identify regulatory interpretation as a primary source of non-compliance.</p>
        </div>

        <!-- Introduction -->
        <div class="paper-section">
          <h2 class="section-head">1. Introduction</h2>
          <p>Food allergy affects an estimated
            <span
              class="cite-inline"
              @mouseenter="showTooltip($event, 2)"
              @mouseleave="startHideTooltip"
              @click="openPanel(2)"
            >1 in 8 consumers<sup class="cite-sup">[2]</sup></span>
            in developed markets, with rising prevalence documented across South Asian populations. Despite regulatory frameworks mandating allergen disclosure, recent systematic reviews indicate that approximately
            <span
              class="cite-inline"
              @mouseenter="showTooltip($event, 1)"
              @mouseleave="startHideTooltip"
              @click="openPanel(1)"
            >34% of packaged food products<sup class="cite-sup">[1]</sup></span>
            show discrepancies between declared allergen content and actual ingredient composition.
          </p>
          <p>In the Indian context, the FSSAI has established a threshold of 10 mg/kg for individual allergen declarations under §4.2.1 of the 2020 labelling regulations,<sup
              class="cite-sup cite-sup-bare"
              @mouseenter="showTooltip($event, 3)"
              @mouseleave="startHideTooltip"
              @click="openPanel(3)"
            >[3]</sup> yet enforcement mechanisms remain inconsistently applied across food category segments.
          </p>
          <p>The foundational challenge is not merely one of regulatory compliance, but of communication design: precautionary allergen labels such as "may contain" are routinely misinterpreted by consumers,<sup
              class="cite-sup cite-sup-bare"
              @mouseenter="showTooltip($event, 3)"
              @mouseleave="startHideTooltip"
              @click="openPanel(3)"
            >[3]</sup> undermining their protective function even where they are accurately applied.
          </p>
        </div>

        <!-- Literature Review -->
        <div class="paper-section">
          <h2 class="section-head">2. Literature Review</h2>
          <p>The landscape of allergen labelling research is characterised by a tension between regulatory prescription and real-world consumer behaviour. Foundational work by
            <span
              class="cite-inline"
              @mouseenter="showTooltip($event, 3)"
              @mouseleave="startHideTooltip"
              @click="openPanel(3)"
            >Hadley &amp; King (2019)<sup class="cite-sup">[3]</sup></span>
            established baseline comprehension rates for precautionary labelling across demographically stratified cohorts, finding that education level and prior allergy diagnosis are the primary moderators of label interpretation accuracy.
          </p>
          <p>Subsequent systematic review of manufacturing-side compliance by
            <span
              class="cite-inline"
              @mouseenter="showTooltip($event, 1)"
              @mouseleave="startHideTooltip"
              @click="openPanel(1)"
            >Popova et al. (2022)<sup class="cite-sup">[1]</sup></span>
            extended this analysis to the supply chain, demonstrating that discrepancies originate as frequently in ingredient sourcing and cross-contact risk management as in the labelling design itself. This has significant implications for how regulatory bodies frame compliance obligations.
          </p>
        </div>

        <!-- Methods (partial) -->
        <div class="paper-section">
          <h2 class="section-head">3. Methods</h2>
          <p class="text-secondary-col">Cross-sectional analysis of n=340 SKUs sampled from organised retail in three Indian metro markets (Chennai, Pune, Hyderabad). Audit conducted against FSSAI 2020 labelling regulations with comparative coding against EU and US frameworks. Inter-rater reliability: κ = 0.87. [Draft continues…]</p>
        </div>
      </div>
    </div>

    <!-- Citation Panel (slide in) -->
    <Transition name="panel">
      <div class="citation-panel" v-if="panelOpen">
        <div class="cp-header">
          <span class="cp-label">Source</span>
          <button class="cp-close" @click="closePanel" title="Close">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
              <line x1="1" y1="1" x2="12" y2="12"/>
              <line x1="12" y1="1" x2="1" y2="12"/>
            </svg>
          </button>
        </div>
        <div class="cp-body" v-if="activeCitation">
          <p class="cp-title">{{ activeCitation.title }}</p>
          <div class="cp-meta">
            <span class="cp-authors">{{ activeCitation.authors }}</span>
            <span class="cp-journal">{{ activeCitation.journal }} · {{ activeCitation.year }}</span>
            <span class="cp-doi">{{ activeCitation.doi }}</span>
          </div>
          <div class="cp-block">
            <div class="cp-block-label">Abstract</div>
            <p class="cp-abstract">{{ activeCitation.abstract }}</p>
          </div>
          <div class="cp-block cp-notes">
            <div class="cp-block-label">Your notes</div>
            <p class="cp-notes-text">{{ activeCitation.yourNotes }}</p>
          </div>
          <button class="cp-detail-btn" @click="goToPdf">
            View in Detail
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 6.5h9M7.5 2.5l4 4-4 4"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Tooltip (teleported to body so it clears all z-index contexts) -->
  <Teleport to="body">
    <div
      class="cite-tooltip"
      v-show="tooltipVisible && tooltipCitation"
      :style="tooltipStyle"
      @mouseenter="cancelHideTooltip"
      @mouseleave="startHideTooltip"
    >
      <template v-if="tooltipCitation">
        <div class="tt-title">{{ tooltipCitation.title }}</div>
        <div class="tt-authors">{{ tooltipCitation.authors }} · {{ tooltipCitation.year }}</div>
        <div class="tt-excerpt">{{ tooltipCitation.abstract.slice(0, 130) }}…</div>
        <button class="tt-cta" @click="openTooltipCitation">View in detail →</button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.write-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* Document scroll area */
.document-area {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-document);
  display: flex;
  justify-content: center;
  padding: 40px 28px 80px;
  min-width: 0;
}

/* The "paper" card */
.paper {
  width: 100%;
  max-width: 660px;
  background: var(--surface-solid);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 52px 60px 64px;
  border: 1px solid rgba(0,0,0,0.05);
  height: fit-content;
}

.paper-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  margin-bottom: 14px;
}

.paper-title {
  font-family: var(--font-doc);
  font-size: 23px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 6px;
}

.paper-subtitle {
  font-family: var(--font-doc);
  font-size: 14.5px;
  font-style: italic;
  color: var(--text-secondary);
  margin-bottom: 18px;
  line-height: 1.5;
}

.paper-byline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.by-sep {
  color: var(--text-tertiary);
}

.paper-rule {
  height: 1px;
  background: var(--border);
  margin-bottom: 28px;
}

.paper-section {
  margin-bottom: 28px;
}

.section-head {
  font-family: var(--font-ui);
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.paper-section p {
  font-family: var(--font-doc);
  font-size: 15.5px;
  line-height: 1.8;
  color: var(--text);
  margin-bottom: 14px;
}

.paper-section p:last-child {
  margin-bottom: 0;
}

.text-secondary-col {
  color: var(--text-secondary) !important;
}

/* Inline citation spans */
.cite-inline {
  cursor: pointer;
  transition: color var(--t);
}

.cite-inline:hover .cite-sup {
  background: var(--accent-soft);
  border-radius: 2px;
}

.cite-sup {
  color: var(--accent);
  font-family: var(--font-ui);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  padding: 0 1.5px;
  border-radius: 2px;
  cursor: pointer;
  transition: background var(--t);
  vertical-align: super;
  line-height: 0;
}

.cite-sup-bare {
  cursor: pointer;
}
.cite-sup-bare:hover {
  background: var(--accent-soft);
  border-radius: 2px;
}

/* Citation Panel */
.citation-panel {
  width: 336px;
  flex-shrink: 0;
  border-left: 3px solid var(--accent);
  background: var(--surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.06);
}

.cp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.cp-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-tertiary);
}

.cp-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: background var(--t), color var(--t);
}
.cp-close:hover {
  background: var(--bg-chrome-active);
  color: var(--text);
}

.cp-body {
  padding: 18px 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cp-title {
  font-family: var(--font-doc);
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--text);
}

.cp-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cp-authors {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
}

.cp-journal {
  font-size: 11px;
  color: var(--text-secondary);
}

.cp-doi {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
}

.cp-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cp-block-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-tertiary);
}

.cp-abstract {
  font-family: var(--font-doc);
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.cp-notes {
  background: rgba(10, 95, 191, 0.05);
  border-radius: var(--radius);
  padding: 11px 12px;
  border: 1px solid rgba(10, 95, 191, 0.1);
}

.cp-notes-text {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text);
  font-style: italic;
}

.cp-detail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--t);
  margin-top: auto;
  flex-shrink: 0;
}
.cp-detail-btn:hover { opacity: 0.86; }

/* Panel Transition */
.panel-enter-active,
.panel-leave-active {
  transition: transform var(--t), opacity var(--t);
}
.panel-enter-from,
.panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>

<!-- Global tooltip styles — not scoped because it's teleported to body -->
<style>
.cite-tooltip {
  position: fixed;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(0, 0, 0, 0.09);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
  padding: 14px 15px;
  width: 275px;
  pointer-events: auto;
}

.tt-title {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 13px;
  font-weight: 700;
  color: #1A1917;
  line-height: 1.4;
  margin-bottom: 4px;
}

.tt-authors {
  font-size: 11px;
  color: #6B6A68;
  margin-bottom: 8px;
}

.tt-excerpt {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 12px;
  line-height: 1.55;
  color: #6B6A68;
  margin-bottom: 10px;
}

.tt-cta {
  background: none;
  border: none;
  padding: 0;
  font-size: 11.5px;
  font-weight: 600;
  color: #0A5FBF;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
}

.tt-cta:hover {
  text-decoration: underline;
}
</style>

# Quire — Roadmap

**Quire** is an Integrated Research Environment for narrative-first academic writing. Built on Tauri + Vue, it unifies the writing surface, literature references, annotation workbench, and document export into one coherent desktop app — replacing the fragmented stack of Zotero + Overleaf + Positron + Git + PDF viewer that researchers currently glue together by hand.

> _A quire: a set of leaves folded together, forming the unit of a book._

---

## What exists now

The frontend shell with placeholder data demonstrating all 5 core interaction states:

- **Write view** — WYSIWYG document surface with inline citation markers (`[1]`, `[2]`, `[3]`)
- **Citation tooltip** — hover any citation to see title, authors, abstract excerpt
- **Citation panel** — click to open full source detail with your notes, side-by-side with the document
- **Workbench** — annotation blocks pulled from sources, organised against the draft outline
- **PDF reader** — split view: document page left, citing drafts + annotations right

No real files. No real citations. No backend. Pure UI proof-of-concept.

---

## Milestone 0 — Minimal Viable First (now → working tool)

> **Goal:** make the allergen paper session possible without leaving Quire once.

The one session that motivated this project involved: version mismatch → tool switch → copy-pasting frontmatter → recovering data from git history → ctrl+F across 7 PDFs to trace 3 citation numbers → Google for an ORCID. Milestone 0 eliminates every one of those switches.

### What to build

**Rust backend (src-tauri/)**
- `open_document(path)` → read `.qmd` file, return content
- `save_document(path, content)` → write `.qmd`
- `load_bib(path)` → parse `.bib`, return structured list of entries
- `run_quarto(path, format)` → shell out to `quarto render`, stream stdout back

**Frontend wiring**
- Replace placeholder prose with a real editor — integrate **Tiptap** (ProseMirror-based, Vue-native, supports custom nodes)
- Add a custom Tiptap citation node: renders as `[1]` superscript, stores the cite-key internally
- On app open: file picker → load `.qmd` + auto-detect `.bib` in same directory
- Citation panel: reads from the loaded `.bib` — real titles, authors, abstracts
- Export button: calls `run_quarto`, shows a progress toast, opens the output file

**File handling**
- Parse YAML frontmatter from `.qmd` on load (title, authors, date → TitleBar)
- Save on `Ctrl+S`, auto-save every 60s
- Show unsaved indicator in TitleBar ("●" before title)

### What this unlocks

A researcher can open their real `.qmd` manuscript, see their actual `.bib` citations resolve in the hover panel, and export to PDF — all without leaving Quire. The core citation-tracing pain from the allergen session is gone.

### Estimated scope
~4–6 sessions of focused work. Tiptap integration is the largest single piece.

---

## Milestone 1 — Workbench as a real tool

> **Goal:** annotation blocks pulled from actual sources, not typed by hand.

- **Zotero connector**: read from Zotero's local Better BibTeX JSON export (`~/Zotero/...`) — no API key, no sync, just file watching
- **PDF annotation import**: Zotero stores PDF annotations in its SQLite database — read highlighted text + page number + color per paper, surface them as workbench blocks automatically
- **Drag to draft**: drag an annotation block from the workbench into the document — inserts a blockquote with the cite-key attached
- **Block provenance**: every block remembers its source paper + page; clicking it opens PDF reader at that exact page
- **Workbench persistence**: save workbench state per document in a sidecar `.quire.json` file

---

## Milestone 2 — PDF reader with real rendering

> **Goal:** replace the placeholder PDF page with an actual rendered document.

- Integrate **PDF.js** (via npm) in the PDF view — render real pages
- Highlight annotations synced from Zotero data
- Click a highlighted region → jump to that annotation block in the Workbench
- "Back" navigation: click citation `[1]` in your draft → open that source's PDF at the relevant page → back arrow returns to draft cursor position
- Search within PDF (replaces the ctrl+F workflow)

---

## Milestone 3 — Author registry

> **Goal:** author metadata as a first-class object, not a Google search.

- **Author panel**: a lab-level author registry (stored in `~/.quire/authors.json`)
- Fields: display name, ORCID, affiliation, email, CRediT roles
- On document open: parse `authors:` frontmatter → match to registry or prompt to add
- ORCID lookup: type a name → fetch from `https://pub.orcid.org/v3.0/search` → one-click import
- CRediT roles picker: checkboxes for all 14 CRediT taxonomy roles, written into frontmatter
- Used by the export pipeline: auto-formats author block for different journal templates

---

## Milestone 4 — Git-aware document history

> **Goal:** version control that understands research stages, not just diffs.

- **Stage labels**: on commit, tag with a research stage — `drafting`, `revising`, `under-review`, `submitted`, `published`
- **History panel**: a fourth sidebar mode showing commit history with stage labels and word count delta
- **Prose diff**: side-by-side diff view using sentence-level diffing (not line-level — prose doesn't live in lines)
- **Recover from history**: the allergen session had to manually copy data from a GitHub commit — Quire shows history inline and lets you copy any paragraph from any past version
- Wraps `git` via Tauri shell commands — no separate git installation required beyond what Tauri already bundles

---

## Milestone 5 — Multi-format export pipeline

> **Goal:** replace Overleaf as the compilation environment.

- Export targets: PDF (via Quarto + LaTeX), DOCX, HTML, ePub
- **Journal templates**: download and apply Quarto journal templates (ASA, APA, Nature, PLOS, etc.) from a curated list
- **Preflight check**: before export, verify — all citations resolve in .bib, all figures have captions, word count within target, required frontmatter fields present
- **LaTeX passthrough**: for journals that require raw `.tex` — Quire generates the `.tex` and lets you inspect/edit before bundling
- Export history: every export is logged with timestamp + format + git commit SHA → full audit trail from draft to submission

---

## Milestone 6 — Collaboration (stretch)

> **Goal:** co-authoring without leaving Quire.

- Comment threads on any paragraph (stored in `.quire.json`, not in the document itself)
- Annotated docx import: parse revision marks from a supervisor's `.docx` → surface them as inline comments in the writing view (this directly replaces the "opened annotated docx in Google Forms" step from the allergen session)
- Export author contributions section from the CRediT registry automatically
- SMTP integration: send draft for review directly from Quire, with ORCID-formatted author metadata pre-filled

---

## Dependency order

```
Milestone 0 (real editing + real .bib)
    └── Milestone 1 (workbench with real annotations)
            └── Milestone 2 (PDF reader — needs annotation data from M1)
Milestone 0
    └── Milestone 3 (author registry — needs frontmatter parsing from M0)
            └── Milestone 5 (export pipeline — needs author registry for templates)
Milestone 0
    └── Milestone 4 (git history — needs real files to track)
Milestones 1–5
    └── Milestone 6 (collaboration — builds on all prior layers)
```

---

## Non-goals (explicitly out of scope)

- **Real-time collaborative editing** (Google Docs model) — out of scope; this is a local-first tool
- **Cloud sync** — Quire works on local files; sync is the user's responsibility (git, Dropbox, etc.)
- **Reference discovery / lit search** — Quire manages sources you've already found, not finding them
- **Data analysis / R/Python integration** — out of scope for v1; Quarto's execution model handles this if needed
- **Mobile** — desktop only; Tauri mobile exists but research writing is a desktop workflow

---

## Stack decisions (locked)

| Layer | Choice | Reason |
|---|---|---|
| Shell | Tauri 2 | Native desktop, small binary, Rust backend |
| Frontend framework | Vue 3 + TypeScript | Existing setup, Composition API suits reactive panels |
| Editor engine | Tiptap (Milestone 0) | ProseMirror-based, Vue-native, supports custom nodes |
| PDF rendering | PDF.js (Milestone 2) | Browser-native, no native dependency |
| Styling | Plain CSS + CSS variables | No framework overhead, full control |
| Router | vue-router 4 | Already installed |
| Citations | .bib parsing in Rust | Fast, no JS dependency for parsing |
| Quarto/Pandoc | Shell via Tauri | Let Quarto handle the complexity |

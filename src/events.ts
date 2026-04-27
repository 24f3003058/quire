import mitt from 'mitt'

export type Events = {
  'cite:hover': { key: string; rect: DOMRect }
  'cite:leave': void
  'cite:click': { key: string }
  'doc:saved': { path: string }
  'doc:opened': { path: string; content: string }
  'bib:loaded': void
  'export:start': void
  'export:done': { outputPath: string }
  'export:error': { message: string }
  // Command palette dispatched actions
  'cmd:new-doc': void
  'cmd:open-file': void
  'cmd:save': void
  'cmd:export': void
  'cmd:toggle-focus': void
  'cmd:toggle-zen': void
  'cmd:doi-import': void
  'cmd:ai-panel': { mode?: 'explain' | 'synthesize' | 'check' }
  'cmd:bib-dedup': void
  'cmd:navigate-heading': { headingId: string }
  'cmd:insert-cite': { citeKey: string }
  'cmd:section-ref': void
}

export const emitter = mitt<Events>()

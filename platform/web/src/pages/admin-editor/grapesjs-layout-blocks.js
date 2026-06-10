const ICON_SECTION = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 4h20v16H2V4m2 2v12h16V6H4z"/></svg>`
const ICON_HEADER = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h18v4H3V5m0 10h18v4H3v-4z"/></svg>`
const ICON_FOOTER = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 18h20v2H2v-2M2 4h20v10H2V4m2 2v6h16V6H4z"/></svg>`
const ICON_CONTAINER = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 6h16v12H4V6m2 2v8h12V8H6z"/></svg>`
const ICON_DIVIDER = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 11h20v2H2v-2z"/></svg>`

export default function grapesjsLayoutBlocks(editor, opts = {}) {
  const category = opts.category || 'Layout'
  const bm = editor.BlockManager

  bm.add('layout-section', {
    label: 'Section',
    category,
    select: true,
    media: ICON_SECTION,
    content: `<section data-gjs-droppable="true" style="padding:48px 20px;width:100%;box-sizing:border-box;"></section>`
  })

  bm.add('layout-header', {
    label: 'Header',
    category,
    select: true,
    media: ICON_HEADER,
    content: `<header data-gjs-droppable="true" style="padding:20px;width:100%;box-sizing:border-box;"></header>`
  })

  bm.add('layout-footer', {
    label: 'Footer',
    category,
    select: true,
    media: ICON_FOOTER,
    content: `<footer data-gjs-droppable="true" style="padding:32px 20px;width:100%;box-sizing:border-box;"></footer>`
  })

  bm.add('layout-container', {
    label: 'Container',
    category,
    select: true,
    media: ICON_CONTAINER,
    content: `<div data-gjs-droppable="true" style="max-width:1140px;margin:0 auto;padding:0 20px;width:100%;box-sizing:border-box;"></div>`
  })

  bm.add('layout-divider', {
    label: 'Divider',
    category,
    select: true,
    media: ICON_DIVIDER,
    content: `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;width:100%;"/>`
  })
}

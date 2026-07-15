#!/usr/bin/env node
/**
 * Testes unitarios das funcoes de migracao/validacao de breakpoint GrapesJS.
 */
const assert = require('assert')
const {
  migrateCssSnapshot,
  migrateGrapesProjectJson,
  validateCssExport,
  TARGET_MOBILE_MEDIA
} = require('./lib/grapes-breakpoint')

function testMigrateCssSnapshot() {
  const input = '.a{color:red;}@media (max-width: 480px){.b{width:100px;}}'
  const result = migrateCssSnapshot(input)
  assert.strictEqual(result.changed, true)
  assert.strictEqual(result.replacements, 1)
  assert.ok(result.css.includes(`@media ${TARGET_MOBILE_MEDIA}`))
  assert.ok(!result.css.includes('480px'))
}

function testMigrateCssSnapshotNoChange() {
  const input = `.a{color:red;}@media ${TARGET_MOBILE_MEDIA}{.b{width:100px;}}`
  const result = migrateCssSnapshot(input)
  assert.strictEqual(result.changed, false)
  assert.strictEqual(result.replacements, 0)
}

function testMigrateGrapesProjectJson() {
  const input = {
    styles: [
      { selectors: ['box'], style: { width: '100px' } },
      {
        selectors: ['box'],
        mediaText: '(max-width: 480px)',
        style: { width: '50px' }
      }
    ]
  }
  const result = migrateGrapesProjectJson(input)
  assert.strictEqual(result.changed, true)
  assert.strictEqual(result.replacements, 1)
  assert.strictEqual(result.json.styles[1].mediaText, TARGET_MOBILE_MEDIA)
}

function testValidateCssExportOk() {
  const css = `.box{width:100px;}@media ${TARGET_MOBILE_MEDIA}{.box{width:50px;}}`
  const json = {
    styles: [
      { selectors: ['box'], style: { width: '100px' } },
      {
        selectors: ['box'],
        mediaText: TARGET_MOBILE_MEDIA,
        style: { width: '50px' }
      }
    ]
  }
  const result = validateCssExport({ cssSnapshot: css, grapesProjectJson: json })
  assert.strictEqual(result.ok, true)
  assert.strictEqual(result.missingRules.length, 0)
}

function testValidateCssExportDetectsLegacy480() {
  const css = '@media (max-width: 480px){.box{width:50px;}}'
  const json = {
    styles: [
      {
        selectors: ['box'],
        mediaText: '(max-width: 480px)',
        style: { width: '50px' }
      }
    ]
  }
  const result = validateCssExport({ cssSnapshot: css, grapesProjectJson: json })
  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.legacy480InCss, true)
  assert.strictEqual(result.legacy480InJson, true)
}

const tests = [
  ['migrateCssSnapshot', testMigrateCssSnapshot],
  ['migrateCssSnapshotNoChange', testMigrateCssSnapshotNoChange],
  ['migrateGrapesProjectJson', testMigrateGrapesProjectJson],
  ['validateCssExportOk', testValidateCssExportOk],
  ['validateCssExportDetectsLegacy480', testValidateCssExportDetectsLegacy480]
]

let failed = 0
for (const [name, fn] of tests) {
  try {
    fn()
    console.log(`ok ${name}`)
  } catch (err) {
    failed += 1
    console.error(`FAIL ${name}:`, err.message)
  }
}

if (failed > 0) process.exit(1)
console.log(`\n${tests.length} testes passaram.`)

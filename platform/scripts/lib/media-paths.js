const fs = require('fs')
const path = require('path')

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', '..', 'api', 'uploads')
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports')

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true })
}

function reportPath(prefix) {
  ensureReportsDir()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return path.join(REPORTS_DIR, `${prefix}-${stamp}.json`)
}

function walkUploadFiles(uploadsDir = UPLOADS_DIR) {
  const files = []
  if (!fs.existsSync(uploadsDir)) return files

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(abs)
      else if (entry.isFile()) {
        const relativePath = path.relative(uploadsDir, abs).replace(/\\/g, '/')
        const stat = fs.statSync(abs)
        files.push({
          absolutePath: abs,
          relativePath,
          filename: entry.name,
          sizeBytes: stat.size
        })
      }
    }
  }

  walk(uploadsDir)
  return files
}

module.exports = {
  UPLOADS_DIR,
  REPORTS_DIR,
  ensureReportsDir,
  reportPath,
  walkUploadFiles
}

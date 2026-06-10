require('dotenv').config()
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { XMLParser } = require('fast-xml-parser')

const XML_PATH = path.resolve(__dirname, 'terraorgnica.WordPress.2026-05-07.xml')
const OUTPUT_DIR = path.resolve(__dirname, '..', 'web', 'public', 'uploads')
const BASE_HOST = 'https://compostagemterraorganica.com.br/wp-content/uploads/'

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function extractUploadUrls(xmlContent) {
  const parser = new XMLParser({ ignoreAttributes: false })
  const parsed = parser.parse(xmlContent)
  const items = parsed?.rss?.channel?.item || []
  const normalized = Array.isArray(items) ? items : [items]
  const urls = new Set()

  normalized.forEach((item) => {
    const attachment = item?.['wp:attachment_url']
    if (attachment && attachment.startsWith(BASE_HOST)) urls.add(attachment)
    const content = item?.['content:encoded'] || ''
    const matches = String(content).match(/https:\/\/compostagemterraorganica\.com\.br\/wp-content\/uploads\/[^\s"'<>]+/g) || []
    matches.forEach((url) => urls.add(url))
  })

  return Array.from(urls)
}

async function downloadMedia(url) {
  const rel = url.replace(BASE_HOST, '')
  const target = path.resolve(OUTPUT_DIR, rel)
  ensureDir(path.dirname(target))
  if (fs.existsSync(target)) return { url, status: 'skipped', target }

  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
  fs.writeFileSync(target, response.data)
  return { url, status: 'downloaded', target }
}

function rewriteLinksInHtmlFiles(baseDir) {
  const htmlFiles = fs.readdirSync(baseDir).filter((f) => f.endsWith('.html'))
  htmlFiles.forEach((file) => {
    const filePath = path.join(baseDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const rewritten = content.replaceAll(BASE_HOST, '/uploads/')
    fs.writeFileSync(filePath, rewritten, 'utf8')
  })
}

async function run() {
  ensureDir(OUTPUT_DIR)
  const xmlContent = fs.readFileSync(XML_PATH, 'utf8')
  const urls = extractUploadUrls(xmlContent)
  const report = { total: urls.length, downloaded: 0, skipped: 0, failed: 0, errors: [] }

  for (const url of urls) {
    try {
      const result = await downloadMedia(url)
      if (result.status === 'downloaded') report.downloaded += 1
      if (result.status === 'skipped') report.skipped += 1
    } catch (error) {
      report.failed += 1
      report.errors.push({ url, message: error.message })
    }
  }

  rewriteLinksInHtmlFiles(path.resolve(__dirname, '..', 'terraorganica-site'))

  const reportPath = path.resolve(__dirname, 'reports', `media-migration-report-${Date.now()}.json`)
  ensureDir(path.dirname(reportPath))
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`Migração concluída. Report: ${reportPath}`)
}

run().catch((error) => {
  console.error('Falha na migração:', error)
  process.exit(1)
})

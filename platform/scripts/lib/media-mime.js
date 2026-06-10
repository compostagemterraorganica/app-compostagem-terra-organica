const path = require('path')

const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf'
}

function mimeFromFilename(filename) {
  const ext = path.extname(filename).toLowerCase()
  return EXT_MIME[ext] || 'application/octet-stream'
}

module.exports = { mimeFromFilename }

function extractFirstImageUrl(html) {
  if (!html || typeof html !== 'string') return null;

  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) return imgMatch[1];

  const bgMatch = html.match(/background(?:-image)?\s*:\s*[^;]*url\(["']?([^"')]+)["']?\)/i);
  return bgMatch?.[1] || null;
}

module.exports = { extractFirstImageUrl };

import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import HtmlContent from '../../components/HtmlContent'
import TerraLoader from '../../components/TerraLoader'
import api from '../../lib/api'
import { preloadHeroBackground } from '../../lib/preloadHeroBackground'

function resolveSlug(paramSlug, pathname) {
  if (paramSlug) return paramSlug
  const path = pathname.replace(/^\//, '').replace(/\/$/, '')
  return path || 'home'
}

export default function PublicPage() {
  const { slug: paramSlug } = useParams()
  const { pathname } = useLocation()
  const slug = resolveSlug(paramSlug, pathname)
  const isHome = slug === 'home'
  const [page, setPage] = useState(null)
  const [heroReady, setHeroReady] = useState(!isHome)
  const [error, setError] = useState('')

  useEffect(() => {
    setPage(null)
    setError('')
    setHeroReady(slug !== 'home')

    api
      .get(`/pages/public/${slug}`)
      .then((res) => setPage(res.data.data))
      .catch(() => setError('Pagina ainda nao publicada.'))
  }, [slug])

  useEffect(() => {
    if (!page || !isHome) return undefined

    let cancelled = false
    setHeroReady(false)

    preloadHeroBackground(page.css_snapshot).then(() => {
      if (!cancelled) setHeroReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [page, isHome])

  if (error) return <p>{error}</p>
  if (!page || !heroReady) {
    return <TerraLoader layout="fullscreen" size="lg" label="Carregando..." />
  }

  return (
    <article className="public-page">
      {page.css_snapshot ? <style>{page.css_snapshot}</style> : null}
      <HtmlContent
        className="public-page-body"
        html={page.html_snapshot || '<p>Sem conteudo publicado.</p>'}
      />
    </article>
  )
}

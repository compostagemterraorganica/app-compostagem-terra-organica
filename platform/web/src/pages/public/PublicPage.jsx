import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import TerraLoader from '../../components/TerraLoader'
import api from '../../lib/api'

function resolveSlug(paramSlug, pathname) {
  if (paramSlug) return paramSlug
  const path = pathname.replace(/^\//, '').replace(/\/$/, '')
  return path || 'home'
}

export default function PublicPage() {
  const { slug: paramSlug } = useParams()
  const { pathname } = useLocation()
  const slug = resolveSlug(paramSlug, pathname)
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/pages/public/${slug}`)
      .then((res) => setPage(res.data.data))
      .catch(() => setError('Pagina ainda nao publicada.'))
  }, [slug])

  if (error) return <p>{error}</p>
  if (!page) return <TerraLoader layout="fullscreen" size="lg" label="Carregando..." />

  return (
    <article className="public-page">
      {page.css_snapshot ? <style>{page.css_snapshot}</style> : null}
      <div
        className="public-page-body"
        dangerouslySetInnerHTML={{ __html: page.html_snapshot || '<p>Sem conteudo publicado.</p>' }}
      />
    </article>
  )
}

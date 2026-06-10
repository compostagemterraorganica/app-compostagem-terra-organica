import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import TerraLoader from './TerraLoader'
import api from '../lib/api'

export default function CmsPageShell({ slug, children, portalId }) {
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')
  const [portalTarget, setPortalTarget] = useState(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    setPortalTarget(null)
    api
      .get(`/pages/public/${slug}`)
      .then((res) => setPage(res.data.data))
      .catch(() => setError('Pagina ainda nao publicada.'))
  }, [slug])

  useEffect(() => {
    if (!page || !bodyRef.current) return
    bodyRef.current.innerHTML = page.html_snapshot || '<p>Sem conteudo publicado.</p>'
    if (portalId) {
      setPortalTarget(document.getElementById(portalId))
    }
  }, [page, portalId])

  if (error) return <p>{error}</p>
  if (!page) return <TerraLoader layout="fullscreen" size="lg" label="Carregando..." />

  return (
    <article className="public-page">
      {page.css_snapshot ? <style>{page.css_snapshot}</style> : null}
      <div ref={bodyRef} className="public-page-body" />
      {portalId && portalTarget ? createPortal(children, portalTarget) : null}
      {!portalId ? children : null}
    </article>
  )
}

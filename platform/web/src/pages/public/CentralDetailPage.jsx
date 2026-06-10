import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TerraLoader from '../../components/TerraLoader'
import api from '../../lib/api'

const detailCss = `
.to-central-detail { font-family: "Raleway", sans-serif; color: #3a3a3a; }
.to-central-detail-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; max-width: 1140px; margin: 0 auto; padding: 48px 20px; }
.to-central-detail-hero img { width: 100%; border-radius: 8px; object-fit: cover; aspect-ratio: 16/9; }
.to-central-detail-hero h1 { margin: 0 0 16px; font-size: 2rem; color: #0274be; }
.to-central-detail-meta { color: #54595f; margin: 8px 0; }
.to-central-detail-volumes { display: flex; gap: 32px; margin: 24px 0; }
.to-central-detail-vol span { display: block; font-size: 12px; text-transform: uppercase; color: #888; }
.to-central-detail-vol strong { font-size: 28px; color: #3CAA59; }
.to-central-detail-content { max-width: 900px; margin: 0 auto; padding: 0 20px 48px; line-height: 1.7; }
.to-central-detail-content img { max-width: 100%; height: auto; }
.to-central-detail-back { display: inline-block; margin: 24px 20px; color: #0274be; text-decoration: none; font-weight: 600; }
.to-central-verifications { max-width: 900px; margin: 0 auto; padding: 0 20px 48px; }
.to-central-verifications h2 { color: #0274be; font-size: 1.5rem; }
.to-central-verifications ul { list-style: none; padding: 0; }
.to-central-verifications li { padding: 12px 0; border-bottom: 1px solid #eee; }
@media (max-width: 767px) {
  .to-central-detail-hero { grid-template-columns: 1fr; }
}
`.trim()

export default function CentralDetailPage() {
  const { slug } = useParams()
  const [central, setCentral] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/centrals/public/${slug}`)
      .then((res) => setCentral(res.data.data))
      .catch(() => setError('Central nao encontrada.'))
  }, [slug])

  if (error) return <p>{error}</p>
  if (!central) return <TerraLoader layout="fullscreen" size="lg" label="Carregando..." />

  const location = [central.city, central.state].filter(Boolean).join(' — ')

  return (
    <article className="to-central-detail">
      <style>{detailCss}</style>
      <Link className="to-central-detail-back" to="/pontos-de-entrega">
        ← Voltar aos pontos de entrega
      </Link>
      <div className="to-central-detail-hero">
        <div>
          {central.image_url ? (
            <img src={central.image_url} alt={central.name} />
          ) : (
            <div style={{ aspectRatio: '16/9', background: '#e8e8e8', borderRadius: 8 }} aria-hidden="true" />
          )}
        </div>
        <div>
          <h1>{central.name}</h1>
          {central.excerpt ? <p>{central.excerpt}</p> : null}
          {central.address ? <p className="to-central-detail-meta">{central.address}</p> : null}
          {location ? <p className="to-central-detail-meta">{location}</p> : null}
          {central.email ? <p className="to-central-detail-meta">{central.email}</p> : null}
          <div className="to-central-detail-volumes">
            <div className="to-central-detail-vol">
              <span>Volume Médio</span>
              <strong>{central.avg_volume_liters || '—'}</strong>
            </div>
            <div className="to-central-detail-vol">
              <span>Volume Total</span>
              <strong>{central.total_volume_liters || '—'}</strong>
            </div>
          </div>
        </div>
      </div>
      {central.content_html ? (
        <div
          className="to-central-detail-content"
          dangerouslySetInnerHTML={{ __html: central.content_html }}
        />
      ) : null}
      {central.verifications?.length ? (
        <section className="to-central-verifications">
          <h2>Verificações recentes</h2>
          <ul>
            {central.verifications.map((v) => (
              <li key={v.id}>
                <strong>{v.volume_liters} L</strong>
                {v.measurement_date ? ` — ${v.measurement_date}` : ''}
                {v.title ? ` — ${v.title}` : ''}
                {v.video_link ? (
                  <>
                    {' '}
                    <a href={v.video_link} target="_blank" rel="noreferrer">
                      Ver vídeo
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}

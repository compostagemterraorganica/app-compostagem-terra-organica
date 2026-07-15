import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import HtmlContent from '../../components/HtmlContent'
import TerraImage from '../../components/TerraImage'
import TerraLoader from '../../components/TerraLoader'
import api from '../../lib/api'
import { formatDate, formatVolume, formatVolumeTotal, formatWeight, formatCentralLocation } from '../../lib/format'

const INSTAGRAM_ICON = (
  <svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
    <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
  </svg>
)

const FACEBOOK_ICON = (
  <svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z" />
  </svg>
)

function normalizeExternalUrl(url) {
  if (!url) return null
  const trimmed = String(url).trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function CentralSocialLinks({ central }) {
  const links = [
    { id: 'instagram', label: 'Instagram', href: normalizeExternalUrl(central.instagram), icon: INSTAGRAM_ICON },
    { id: 'facebook', label: 'Facebook', href: normalizeExternalUrl(central.facebook), icon: FACEBOOK_ICON }
  ].filter((link) => link.href)

  if (!links.length) return null

  return (
    <>
      <h2 className="to-central-detail-social-heading">Redes Sociais e Contato</h2>
      <div className="to-central-detail-social" role="list">
      {links.map((link) => (
        <a
          key={link.id}
          className="to-central-detail-social-link"
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          role="listitem"
        >
          {link.icon}
        </a>
      ))}
      </div>
    </>
  )
}

const detailCss = `
.to-central-detail { font-family: var(--font-family); color: #3a3a3a; background: #f6f8f7; }
.to-central-detail-hero { margin-bottom: 48px; }
.to-central-detail-banner {
  position: relative;
  width: 100%;
  overflow: hidden;
  background-color: #d8d8d8;
  height: clamp(460px, 43.83vw, 640px);
}
.to-central-detail-banner .terra-image,
.to-central-detail-banner .terra-image__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 0 !important;
}
.to-central-detail-panel-wrap {
  max-width: 1140px;
  margin: -95px auto 0;
  padding: 0 20px;
  position: relative;
  z-index: 2;
}
.to-central-detail-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 32px 40px 40px;
}
.to-central-detail-back {
  display: block;
  margin: 0 0 20px;
  text-align: right;
  color: #0274be;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}
.to-central-detail-back:hover { text-decoration: underline; }
.to-central-detail-panel h1 {
  margin: 0 0 20px;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  color: #0274be;
  line-height: 1.2;
}
.to-central-detail-intro { line-height: 1.7; margin: 0 0 16px; color: #3a3a3a; }
.to-central-detail-intro p { margin: 0 0 12px; }
.to-central-detail-intro p:last-child { margin-bottom: 0; }
.to-central-detail-intro a { color: #0274be; font-weight: 600; }
.to-central-detail-meta { color: #54595f; margin: 8px 0; line-height: 1.5; }
.to-central-detail-meta a { color: #0274be; text-decoration: none; }
.to-central-detail-meta a:hover { text-decoration: underline; }
.to-central-detail-social-heading {
  margin: 24px 0 12px;
  font-size: 1.125rem;
  color: #0274be;
  font-weight: 700;
}
.to-central-detail-social { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.to-central-detail-social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0274be;
  color: #fff;
  text-decoration: none;
  transition: background 0.2s ease, opacity 0.2s ease;
}
.to-central-detail-social-link svg { width: 18px; height: 18px; fill: currentColor; }
.to-central-detail-social-link:hover { background: #025a96; opacity: 0.95; }
.to-central-detail-vol { text-align: center; min-width: 120px; }
.to-central-detail-vol span { display: block; font-size: 12px; text-transform: uppercase; color: #888; }
.to-central-detail-vol strong { display: block; font-size: 28px; color: #3CAA59; }
.to-central-verifications { max-width: 1140px; margin: 0 auto; padding: 0 20px 48px; }
.to-central-verifications-volumes {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0;
  max-width: min(100%, 820px);
  margin: 0 auto 32px;
  padding: 28px 40px;
  background: #3CAA59;
  border-radius: 12px;
  color: #fff;
}
.to-central-verifications-volumes .to-central-detail-vol {
  flex: 1 1 0;
  min-width: 280px;
  padding: 0 20px;
}
.to-central-verifications-volumes .to-central-detail-vol:first-child {
  border-right: 1px solid rgba(255, 255, 255, 0.35);
}
.to-central-verifications-volumes .to-central-detail-vol span {
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.to-central-verifications-volumes .to-central-detail-vol strong {
  color: #fff;
  font-size: clamp(18px, 2.2vw, 26px);
  font-weight: 700;
  white-space: nowrap;
  line-height: 1.2;
}
.to-central-verifications h2 { margin: 0 0 24px; color: #0274be; font-size: 1.5rem; }
.to-central-verifications-table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1); }
.to-central-verifications-table { width: 100%; border-collapse: collapse; background: #fff; font-size: 15px; }
.to-central-verifications-table th,
.to-central-verifications-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #eee; vertical-align: top; }
.to-central-verifications-table th { background: #f6f8f7; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #54595f; }
.to-central-verifications-table tbody tr:last-child td { border-bottom: none; }
.to-central-verifications-table tbody tr:hover { background: #fafafa; }
.to-central-verifications-table .to-central-verifications-volume,
.to-central-verifications-table .to-central-verifications-weight { text-align: right; white-space: nowrap; font-weight: 600; color: #3CAA59; }
.to-central-verifications-table .to-central-verifications-date { white-space: nowrap; }
.to-central-verifications-video { color: #0274be; font-weight: 600; text-decoration: none; }
.to-central-verifications-video:hover { text-decoration: underline; }
.to-central-verifications-cta { margin-top: 24px; text-align: center; }
.to-central-verifications-cta-link { display: inline-block; padding: 12px 32px; background: #3CAA59; color: #fff; text-decoration: none; border-radius: 50px; font-family: var(--font-family); font-weight: 600; font-size: 14px; text-transform: uppercase; transition: background 0.2s ease; }
.to-central-verifications-cta-link:hover { background: #2d8a45; color: #fff; }
@media (max-width: 767px) {
  .to-central-detail-banner {
    aspect-ratio: auto;
    min-height: 40vh;
    height: 40vh;
  }
  .to-central-detail-panel-wrap { margin-top: 0; padding: 0 16px; }
  .to-central-detail-panel { padding: 24px 20px 28px; }
  .to-central-verifications-volumes {
    flex-direction: column;
    gap: 20px;
    padding: 24px 20px;
    max-width: 100%;
  }
  .to-central-verifications-volumes .to-central-detail-vol {
    min-width: 0;
    width: 100%;
    padding: 0;
  }
  .to-central-verifications-volumes .to-central-detail-vol:first-child {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.35);
    padding-bottom: 20px;
  }
  .to-central-verifications-volumes .to-central-detail-vol strong {
    font-size: 20px;
    white-space: normal;
  }
  .to-central-verifications-table th,
  .to-central-verifications-table td { padding: 12px; font-size: 14px; }
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

  const locationLine = formatCentralLocation(central)

  return (
    <article className="to-central-detail">
      <style>{detailCss}</style>
      <header className="to-central-detail-hero">
        <div className="to-central-detail-banner">
          {central.image_url ? (
            <TerraImage
              src={central.image_url}
              alt={central.name}
              priority
              fill
              objectFit="cover"
            />
          ) : null}
        </div>
        <div className="to-central-detail-panel-wrap">
          <div className="to-central-detail-panel">
            <Link className="to-central-detail-back" to="/pontos-de-entrega">
              ← Voltar aos pontos de entrega
            </Link>
            <h1>{central.name}</h1>
            {central.content_html ? (
              <HtmlContent
                className="to-central-detail-intro"
                html={central.content_html}
                firstImagePriority={false}
              />
            ) : central.excerpt ? (
              <p className="to-central-detail-intro">{central.excerpt}</p>
            ) : null}
            {locationLine ? <p className="to-central-detail-meta">{locationLine}</p> : null}
            {central.email ? (
              <p className="to-central-detail-meta">
                <a href={`mailto:${central.email}`}>{central.email}</a>
              </p>
            ) : null}
            <CentralSocialLinks central={central} />
          </div>
        </div>
      </header>
      {central.verifications?.length ? (
        <section className="to-central-verifications">
          <div className="to-central-verifications-volumes">
            <div className="to-central-detail-vol">
              <span>Volume Médio</span>
              <strong>{formatVolumeTotal(central.avg_volume_liters)}</strong>
            </div>
            <div className="to-central-detail-vol">
              <span>Volume Total</span>
              <strong>{formatVolumeTotal(central.total_volume_liters)}</strong>
            </div>
          </div>
          <h2>Coletas recentes</h2>
          <div className="to-central-verifications-table-wrap">
            <table className="to-central-verifications-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Título</th>
                  <th>Volume</th>
                  <th>Peso</th>
                  <th>Vídeo</th>
                </tr>
              </thead>
              <tbody>
                {central.verifications.map((v) => (
                  <tr key={v.id}>
                    <td className="to-central-verifications-date">{formatDate(v.measurement_date)}</td>
                    <td>{v.title || '—'}</td>
                    <td className="to-central-verifications-volume">{formatVolume(v.volume_liters)}</td>
                    <td className="to-central-verifications-weight">
                      {formatWeight(v.volume_kg, v.volume_liters)}
                    </td>
                    <td>
                      {v.video_link ? (
                        <a
                          className="to-central-verifications-video"
                          href={v.video_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver vídeo
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="to-central-verifications-cta">
            <Link className="to-central-verifications-cta-link" to="/dados-de-coletas">
              Todos os dados de coleta
            </Link>
          </div>
        </section>
      ) : null}
    </article>
  )
}

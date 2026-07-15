import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TerraImage from './TerraImage'
import TerraLoader from './TerraLoader'
import api from '../lib/api'
import { formatVolumeTotal, truncateWords } from '../lib/format'

const gridVolumeCss = `
.to-pontos-de-entrega .to-central-volumes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin: 12px 0;
}
.to-pontos-de-entrega .to-central-vol {
  flex: 0 1 40px;
  width: 100%;
  text-align: center;
  margin-top: 17px !important;
}
.to-pontos-de-entrega .to-central-vol span {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 2px;
  line-height: 1.2;
}
.to-pontos-de-entrega .to-central-vol strong {
  display: block;
  font-size: clamp(13px, 1.6vw, 18px);
  color: #3CAA59;
  white-space: nowrap;
  line-height: 1.2;
  margin: 0;
}
`.trim()

function CentralCard({ central }) {
  const location = [central.city, central.state].filter(Boolean).join(' — ')
  return (
    <article className="to-central-card">
      {central.image_url ? (
        <TerraImage src={central.image_url} alt={central.name} aspectRatio="16 / 9" />
      ) : (
        <div style={{ aspectRatio: '16/9', background: '#e8e8e8' }} aria-hidden="true" />
      )}
      <div className="to-central-card-body">
        <h3>{central.name}</h3>
        {central.excerpt ? <p>{truncateWords(central.excerpt, 60)}</p> : null}
        {central.address ? <p className="to-central-meta">{central.address}</p> : null}
        {location ? <p className="to-central-meta">{location}</p> : null}
        <div className="to-central-volumes">
          <div className="to-central-vol">
            <span>Volume Médio</span>
            <strong>{formatVolumeTotal(central.avg_volume_liters)}</strong>
          </div>
          <div className="to-central-vol">
            <span>Volume Total</span>
            <strong>{formatVolumeTotal(central.total_volume_liters)}</strong>
          </div>
        </div>
        {central.slug ? (
          <div className="to-central-card-cta">
            <Link className="to-central-link" to={`/central/${central.slug}`}>
              Conhecer
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default function CentralsGrid() {
  const [centrals, setCentrals] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/centrals/public')
      .then((res) => setCentrals(res.data.data || []))
      .catch(() => setError('Nao foi possivel carregar as centrais.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <TerraLoader layout="centered" label="Carregando centrais..." />
  if (error) return <p className="to-form-error">{error}</p>
  if (!centrals.length) return <p className="to-section-lead">Nenhuma central cadastrada.</p>

  return (
    <div className="to-centrals-grid-section">
      <style>{gridVolumeCss}</style>
      <div className="to-centrals-grid">
        {centrals.map((central) => (
          <CentralCard key={central.id} central={central} />
        ))}
      </div>
    </div>
  )
}

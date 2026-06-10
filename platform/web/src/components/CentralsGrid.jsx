import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TerraLoader from './TerraLoader'
import api from '../lib/api'

function CentralCard({ central }) {
  const location = [central.city, central.state].filter(Boolean).join(' — ')
  return (
    <article className="to-central-card">
      {central.image_url ? (
        <img src={central.image_url} alt={central.name} loading="lazy" />
      ) : (
        <div style={{ aspectRatio: '16/9', background: '#e8e8e8' }} aria-hidden="true" />
      )}
      <div className="to-central-card-body">
        <h3>{central.name}</h3>
        {central.excerpt ? <p>{central.excerpt}</p> : null}
        {central.address ? <p className="to-central-meta">{central.address}</p> : null}
        {location ? <p className="to-central-meta">{location}</p> : null}
        <div className="to-central-volumes">
          <div className="to-central-vol">
            <span>Volume Médio</span>
            <strong>{central.avg_volume_liters || '—'}</strong>
          </div>
          <div className="to-central-vol">
            <span>Volume Total</span>
            <strong>{central.total_volume_liters || '—'}</strong>
          </div>
        </div>
        {central.slug ? (
          <Link className="to-central-link" to={`/central/${central.slug}`}>
            Conhecer
          </Link>
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
      <div className="to-centrals-grid">
        {centrals.map((central) => (
          <CentralCard key={central.id} central={central} />
        ))}
      </div>
    </div>
  )
}

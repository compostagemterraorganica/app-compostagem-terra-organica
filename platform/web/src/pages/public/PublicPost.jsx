import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TerraLoader from '../../components/TerraLoader'
import { cmsService } from '../../services/cmsService'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function shareUrl(platform, url, title) {
  const encoded = encodeURIComponent(url)
  const text = encodeURIComponent(title)
  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
    case 'email':
      return `mailto:?subject=${text}&body=${encoded}`
    case 'whatsapp':
      return `https://wa.me/?text=${text}%20${encoded}`
    default:
      return url
  }
}

export default function PublicPost() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setPost(null)
    setError('')
    cmsService
      .getPublicPost(slug)
      .then(setPost)
      .catch(() => setError('Post não encontrado.'))
  }, [slug])

  useEffect(() => {
    cmsService
      .listRecentPosts({ limit: 5, excludeSlug: slug })
      .then(setRecent)
      .catch(() => setRecent([]))
  }, [slug])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    navigate(q ? `/blog?search=${encodeURIComponent(q)}` : '/blog')
  }

  if (error) {
    return (
      <section className="to-blog-single">
        <div className="to-blog-main">
          <p className="to-blog-error">{error}</p>
          <p>
            <Link to="/blog">Voltar ao blog</Link>
          </p>
        </div>
      </section>
    )
  }

  if (!post) {
    return (
      <section className="to-blog-single">
        <div className="to-blog-main">
          <TerraLoader layout="centered" label="Carregando..." />
        </div>
      </section>
    )
  }

  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <section className="to-blog-single">
      <div className="to-blog-single-wrap">
        <main className="to-blog-single-main">
          <h1 className="to-blog-single-title">{post.title}</h1>

          <div className="to-blog-single-meta">
            {post.authorLogin && <span>Por {post.authorLogin}</span>}
            {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          </div>

          <div dangerouslySetInnerHTML={{ __html: post.contentHtml || '' }} />

          <div className="to-blog-share">
            <h3>Compartilhe</h3>
            <div className="to-blog-share-btns">
              <a
                href={shareUrl('facebook', pageUrl, post.title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no Facebook"
                title="Facebook"
              >
                f
              </a>
              <a
                href={shareUrl('twitter', pageUrl, post.title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no Twitter"
                title="Twitter"
              >
                𝕏
              </a>
              <a
                href={shareUrl('linkedin', pageUrl, post.title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no LinkedIn"
                title="LinkedIn"
              >
                in
              </a>
              <a href={shareUrl('email', pageUrl, post.title)} aria-label="Enviar por e-mail" title="E-mail">
                @
              </a>
              <a
                href={shareUrl('whatsapp', pageUrl, post.title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no WhatsApp"
                title="WhatsApp"
              >
                W
              </a>
            </div>
          </div>
        </main>

        <aside className="to-blog-single-sidebar">
          <div className="to-blog-sidebar-widget">
            <h3>Buscar</h3>
            <form className="to-blog-sidebar-search" onSubmit={handleSearch}>
              <input
                type="search"
                placeholder="Buscar no blog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar no blog"
              />
              <button type="submit">Buscar</button>
            </form>
          </div>

          {recent.length > 0 && (
            <div className="to-blog-sidebar-widget">
              <h3>Posts recentes</h3>
              <ul className="to-blog-recent">
                {recent.map((item) => (
                  <li key={item.id}>
                    <Link to={`/blog/${item.slug}`}>{item.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="to-blog-sidebar-widget">
            <h3>Centrais</h3>
            <Link className="to-blog-centrals-link" to="/cadastro-de-centrais">
              Cadastro de Centrais de Compostagem
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}

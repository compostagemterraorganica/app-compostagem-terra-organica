import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TerraImage, { TERRA_IMAGE_PLACEHOLDER } from '../../components/TerraImage'
import { cmsService } from '../../services/cmsService'

const PLACEHOLDER_CARD_COUNT = 6

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current, current - 1, current + 1])
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
}

export default function PublicBlogList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    cmsService
      .listPublicPosts({ page, limit: 12 })
      .then(({ data, pagination: pag }) => {
        setPosts(data || [])
        setPagination(pag || { page: 1, limit: 12, total: 0, totalPages: 1 })
      })
      .catch(() => {
        setPosts([])
        setError('Não foi possível carregar os posts.')
      })
      .finally(() => setLoading(false))
  }, [page])

  const goToPage = (next) => {
    if (next < 1 || next > pagination.totalPages) return
    setSearchParams(next === 1 ? {} : { page: String(next) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageNumbers = buildPageNumbers(pagination.page, pagination.totalPages)

  return (
    <section className="to-blog-list">
      <header className="to-blog-hero">
        <h1>Blog</h1>
        <p>Fique por dentro das notícias e temas relevantes da Terra Orgânica.</p>
      </header>

      <div className="to-blog-main">
        {loading && (
          <div className="to-blog-grid" aria-busy="true" aria-label="Carregando posts">
            {Array.from({ length: PLACEHOLDER_CARD_COUNT }, (_, i) => (
              <article key={`placeholder-${i}`} className="to-blog-card to-blog-card--placeholder">
                <div className="to-blog-card-thumb to-blog-card-thumb--placeholder" />
                <div className="to-blog-card-body">
                  <span className="to-blog-skeleton-line to-blog-skeleton-line--short" />
                  <span className="to-blog-skeleton-line to-blog-skeleton-line--title" />
                  <span className="to-blog-skeleton-line" />
                  <span className="to-blog-skeleton-line to-blog-skeleton-line--short" />
                </div>
              </article>
            ))}
          </div>
        )}

        {error && <p className="to-blog-error">{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="to-blog-empty">Nenhum post publicado no momento.</p>
        )}

        {!loading && !error && posts.length > 0 && (
          <>
            <div className="to-blog-grid">
              {posts.map((post, index) => (
                <article key={post.id} className="to-blog-card">
                  <Link to={`/blog/${post.slug}`} className="to-blog-card-link">
                    <div className="to-blog-card-thumb">
                      <TerraImage
                        src={post.featuredImageUrl || TERRA_IMAGE_PLACEHOLDER}
                        alt={post.title}
                        fill
                        priority={index === 0}
                      />
                    </div>
                    <div className="to-blog-card-body">
                      {post.primaryCategory && (
                        <span className="to-blog-badge">{post.primaryCategory}</span>
                      )}
                      <h3>{post.title}</h3>
                      {post.excerpt && <p>{post.excerpt}</p>}
                      <span className="to-blog-read-more">Continue Lendo</span>
                    </div>
                  </Link>
                  {post.publishedAt && (
                    <div className="to-blog-meta">{formatDate(post.publishedAt)}</div>
                  )}
                </article>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <nav className="to-blog-pagination" aria-label="Paginação do blog">
                {pagination.page > 1 && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      goToPage(pagination.page - 1)
                    }}
                  >
                    Anterior
                  </a>
                )}
                {pageNumbers.map((num, idx) => {
                  const prev = pageNumbers[idx - 1]
                  const gap = prev && num - prev > 1
                  return (
                    <span key={num} style={{ display: 'contents' }}>
                      {gap && <span aria-hidden="true">…</span>}
                      {num === pagination.page ? (
                        <span className="to-blog-page--current">{num}</span>
                      ) : (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            goToPage(num)
                          }}
                        >
                          {num}
                        </a>
                      )}
                    </span>
                  )
                })}
                {pagination.page < pagination.totalPages && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      goToPage(pagination.page + 1)
                    }}
                  >
                    Próximo
                  </a>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  )
}

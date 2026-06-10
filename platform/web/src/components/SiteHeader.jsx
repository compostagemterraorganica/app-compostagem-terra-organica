import { useEffect, useId, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import './SiteHeader.css'

const LOGO_URL = '/images/cropped-cropped-LOGO_CTO_HORIZ.png'

const NAV_LINKS = [
  { to: '/quem-somos', label: 'Quem Somos' },
  { to: '/pontos-de-entrega', label: 'Pontos de entrega' },
  { to: '/financiadores', label: 'Financiadores' },
  { to: '/contato', label: 'Contato' },
  { to: '/blog', label: 'Blog' }
]

function MenuIcon({ open }) {
  if (open) {
    return (
      <svg aria-hidden="true" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
        <path d="M742 167L500 408 258 167C246 154 233 150 217 150 196 150 179 158 167 167 154 179 150 196 150 212 150 229 154 242 171 254L408 500 167 742C138 771 138 800 167 829 196 858 225 858 254 829L496 587 738 829C750 842 767 846 783 846 800 846 817 842 829 829 842 817 846 804 846 783 846 767 842 750 829 737L588 500 833 258C863 229 863 200 833 171 804 137 775 137 742 167Z" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
      <path d="M104 333H896C929 333 958 304 958 271S929 208 896 208H104C71 208 42 237 42 271S71 333 104 333ZM104 583H896C929 583 958 554 958 521S929 458 896 458H104C71 458 42 487 42 521S71 583 104 583ZM104 833H896C929 833 958 804 958 771S929 708 896 708H104C71 708 42 737 42 771S71 833 104 833Z" />
    </svg>
  )
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth > 921) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('resize', closeOnResize)
    return () => window.removeEventListener('resize', closeOnResize)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <div className="site-header-inner">
          <div className="site-header-brand">
            <Link to="/" className="site-header-logo-link" onClick={closeMenu}>
              <img
                src={LOGO_URL}
                alt="Compostagem Terra Orgânica"
                width={1209}
                height={403}
              />
            </Link>
          </div>

          <div className="site-header-nav">
            <nav aria-label="Menu principal" className="site-header-nav-main">
              <ul className="site-header-menu">
                {NAV_LINKS.map((item) => (
                  <li key={item.to} className="site-header-menu-item">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `site-header-menu-link${isActive ? ' is-active' : ''}`
                      }
                      onClick={closeMenu}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <button
              type="button"
              className="site-header-menu-toggle"
              aria-label="Alternar menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>

        <nav
          id={menuId}
          aria-label="Menu"
          className={`site-header-nav-dropdown${menuOpen ? ' is-open' : ''}`}
          aria-hidden={!menuOpen}
        >
          <ul className="site-header-menu site-header-menu--dropdown">
            {NAV_LINKS.map((item) => (
              <li key={`mobile-${item.to}`} className="site-header-menu-item">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `site-header-menu-link${isActive ? ' is-active' : ''}`
                  }
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={closeMenu}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

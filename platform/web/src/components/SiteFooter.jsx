import { Link } from 'react-router-dom'
import TerraImage from './TerraImage'
import './SiteFooter.css'

const LOGO_URL = `https://terraorganica.s3.sa-east-1.amazonaws.com/media/5b5d0004-25c6-49bc-bb8a-5a2ef1c0ad1f.png`

const CONTACT_ITEMS = [
  {
    id: 'location',
    label: 'Av. Pequeno Príncipe, 721 (fundos) – Campeche Central, Florianópolis - SC',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z" />
      </svg>
    )
  },
  {
    id: 'phone',
    label: '+55 (48) 9 9147-4109',
    href: 'https://wa.me/5548991474109',
    external: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
      </svg>
    )
  },
  {
    id: 'email',
    label: 'contato@compostagemterraorganica.com.br',
    href: 'mailto:contato@compostagemterraorganica.com.br',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M502.3 190.8c3.9-3.1 9.7-.2 9.7 4.7V400c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V195.6c0-5 5.7-7.8 9.7-4.7 22.4 17.4 52.1 39.5 154.1 113.6 21.1 15.4 56.7 47.8 92.2 47.6 35.7.3 72-32.8 92.3-47.6 102-74.1 131.6-96.3 154-113.7zM256 320c23.2.4 56.6-29.2 73.4-41.4 132.7-96.3 142.8-104.7 173.4-128.7 5.8-4.5 9.2-11.5 9.2-18.9v-19c0-26.5-21.5-48-48-48H48C21.5 64 0 85.5 0 112v19c0 7.4 3.4 14.3 9.2 18.9 30.6 23.9 40.7 32.4 173.4 128.7 16.8 12.2 50.2 41.8 73.4 41.4z" />
      </svg>
    )
  }
]

const SOCIAL_LINKS = [
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/compostagemterraorganica/',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
      </svg>
    )
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/CompostagemTerraOrganica',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z" />
      </svg>
    )
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/compostagem-terra-org%C3%A2nica',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z" />
      </svg>
    )
  },
  {
    id: 'youtube',
    label: 'YouTube',
    href: 'https://www.youtube.com/channel/UCfLMEXPYo7mPeaNdaE8zsoQ',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg">
        <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z" />
      </svg>
    )
  }
]

export default function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer-contact">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <TerraImage
              src={LOGO_URL}
              alt="Compostagem Terra Orgânica"
              inline
              showSkeleton={false}
              imgClassName="site-footer-logo-img"
              objectFit="contain"
            />
          </div>
          <div className="site-footer-info">
            <p className="site-footer-heading">Fale conosco</p>
            <ul className="site-footer-list">
              {CONTACT_ITEMS.map((item) => (
                <li key={item.id} className="site-footer-item">
                  <span className="site-footer-item-icon">{item.icon}</span>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="site-footer-item-label"
                      {...(item.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {item.label}
                    </a>
                  ) : item.to ? (
                    <Link to={item.to} className="site-footer-item-label">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="site-footer-item-label">{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="site-footer-social" role="list">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.id}
                  className="site-footer-social-link"
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
          </div>
        </div>
      </div>
      <div className="site-footer-copy">
        <p>
          ©Copyright {year} – Compostagem Terra Orgânica.
          <br />
          Todos os direitos reservados.
          <br />
          <Link to="/politica-de-privacidade" className="site-footer-privacy-link">
            Política de Privacidade
          </Link>
        </p>
      </div>
    </footer>
  )
}

import { Outlet } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="page-content">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}

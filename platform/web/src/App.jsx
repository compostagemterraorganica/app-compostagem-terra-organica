import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SITE_TITLE } from './lib/site'
import AppLayout from './layouts/AppLayout'
import EditorLayout from './layouts/EditorLayout'
import EditorCentrals from './pages/admin-editor/EditorCentrals'
import EditorLogin from './pages/admin-editor/EditorLogin'
import EditorPageBuilder from './pages/admin-editor/EditorPageBuilder'
import EditorPagesList from './pages/admin-editor/EditorPagesList'
import EditorPostsList from './pages/admin-editor/EditorPostsList'
import EditorUsers from './pages/admin-editor/EditorUsers'
import EditorVolumeVerifications from './pages/admin-editor/EditorVolumeVerifications'
import DashDashboard from './pages/admin-dash/DashDashboard'
import CentralRegistrationPage from './pages/public/CentralRegistrationPage'
import CentralDetailPage from './pages/public/CentralDetailPage'
import ContatoPage from './pages/public/ContatoPage'
import DeliveryPointsPage from './pages/public/DeliveryPointsPage'
import FinanciadoresPage from './pages/public/FinanciadoresPage'
import PublicBlogList from './pages/public/PublicBlogList'
import PublicPage from './pages/public/PublicPage'
import PublicPost from './pages/public/PublicPost'

export default function App() {
  useEffect(() => {
    document.title = SITE_TITLE
  }, [])

  return (
    <Routes>
      <Route path="/admin" element={<EditorLayout />}>
        <Route path="editor/login" element={<EditorLogin />} />
        <Route path="editor/pages" element={<EditorPagesList />} />
        <Route path="editor/pages/:id/edit" element={<EditorPageBuilder />} />
        <Route path="editor/posts" element={<EditorPostsList />} />
        <Route path="editor/users" element={<EditorUsers />} />
        <Route path="editor/centrals" element={<EditorCentrals />} />
        <Route path="editor/volume-verifications" element={<EditorVolumeVerifications />} />
        <Route path="dash/centrals" element={<Navigate to="/admin/editor/centrals" replace />} />
        <Route path="dash/dashboard" element={<DashDashboard />} />
      </Route>

      <Route path="/" element={<AppLayout />}>
        <Route index element={<PublicPage />} />
        <Route path="quem-somos" element={<PublicPage />} />
        <Route path="financiadores" element={<FinanciadoresPage />} />
        <Route path="contato" element={<ContatoPage />} />
        <Route path="pontos-de-entrega" element={<DeliveryPointsPage />} />
        <Route path="central/:slug" element={<CentralDetailPage />} />
        <Route path="cadastro-de-centrais" element={<CentralRegistrationPage />} />
        <Route path="blog" element={<PublicBlogList />} />
        <Route path="blog/:slug" element={<PublicPost />} />
        <Route path=":slug" element={<PublicPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

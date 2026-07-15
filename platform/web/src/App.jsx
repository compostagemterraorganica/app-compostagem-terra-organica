import { useEffect } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { SITE_TITLE } from './lib/site'
import { ADMIN_ROUTES } from './lib/adminRoutes'
import AppLayout from './layouts/AppLayout'
import EditorLayout from './layouts/EditorLayout'
import EditorCentrals from './pages/admin-editor/EditorCentrals'
import EditorLogin from './pages/admin-editor/EditorLogin'
import EditorPageBuilder from './pages/admin-editor/EditorPageBuilder'
import EditorPagesList from './pages/admin-editor/EditorPagesList'
import EditorPostsList from './pages/admin-editor/EditorPostsList'
import EditorUsers from './pages/admin-editor/EditorUsers'
import EditorContactMessages from './pages/admin-editor/EditorContactMessages'
import EditorVolumeVerifications from './pages/admin-editor/EditorVolumeVerifications'
import DashDashboard from './pages/admin-dash/DashDashboard'
import CentralRegistrationPage from './pages/public/CentralRegistrationPage'
import CentralDetailPage from './pages/public/CentralDetailPage'
import ContatoPage from './pages/public/ContatoPage'
import DeliveryPointsPage from './pages/public/DeliveryPointsPage'
import FinanciadoresPage from './pages/public/FinanciadoresPage'
import DadosColetasPage from './pages/public/DadosColetasPage'
import PublicBlogList from './pages/public/PublicBlogList'
import PublicPage from './pages/public/PublicPage'
import PublicPost from './pages/public/PublicPost'

function RedirectLegacyPageEdit() {
  const { id } = useParams()
  return <Navigate to={ADMIN_ROUTES.pageEdit(id)} replace />
}

export default function App() {
  useEffect(() => {
    document.title = SITE_TITLE
  }, [])

  return (
    <Routes>
      <Route path="/admin" element={<EditorLayout />}>
        <Route index element={<Navigate to={ADMIN_ROUTES.centrals} replace />} />
        <Route path="entrar" element={<EditorLogin />} />
        <Route path="paginas" element={<EditorPagesList />} />
        <Route path="paginas/:id/editar" element={<EditorPageBuilder />} />
        <Route path="publicacoes" element={<EditorPostsList />} />
        <Route path="mensagens" element={<EditorContactMessages />} />
        <Route path="usuarios" element={<EditorUsers />} />
        <Route path="centrais" element={<EditorCentrals />} />
        <Route path="verificacoes" element={<EditorVolumeVerifications />} />
        <Route path="painel" element={<DashDashboard />} />

        <Route path="editor/login" element={<Navigate to={ADMIN_ROUTES.login} replace />} />
        <Route path="editor/pages" element={<Navigate to={ADMIN_ROUTES.pages} replace />} />
        <Route path="editor/pages/:id/edit" element={<RedirectLegacyPageEdit />} />
        <Route path="editor/posts" element={<Navigate to={ADMIN_ROUTES.posts} replace />} />
        <Route path="editor/contact-messages" element={<Navigate to={ADMIN_ROUTES.messages} replace />} />
        <Route path="editor/users" element={<Navigate to={ADMIN_ROUTES.users} replace />} />
        <Route path="editor/centrals" element={<Navigate to={ADMIN_ROUTES.centrals} replace />} />
        <Route path="editor/volume-verifications" element={<Navigate to={ADMIN_ROUTES.verifications} replace />} />
        <Route path="dash/centrals" element={<Navigate to={ADMIN_ROUTES.centrals} replace />} />
        <Route path="dash/dashboard" element={<Navigate to={ADMIN_ROUTES.dashboard} replace />} />
      </Route>

      <Route path="/" element={<AppLayout />}>
        <Route index element={<PublicPage />} />
        <Route path="quem-somos" element={<PublicPage />} />
        <Route path="politica-de-privacidade" element={<PublicPage />} />
        <Route path="financiadores" element={<FinanciadoresPage />} />
        <Route path="dados-de-coletas" element={<DadosColetasPage />} />
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

import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined'
import MailOutlinedIcon from '@mui/icons-material/MailOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import {
  Badge,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { useCallback, useEffect, useState } from 'react'
import { formsService } from '../services/formsService'
import { ADMIN_ROUTES } from '../lib/adminRoutes'
import { Link, Navigate, Outlet, useLocation, useMatch } from 'react-router-dom'
import TerraImage from '../components/TerraImage'
import TerraLoader from '../components/TerraLoader'
import { useAuth } from '../contexts/AuthContext'
import { adminTheme } from '../theme/adminTheme'
import '../styles/admin-drawer.css'

const LOGO_URL = '/images/cropped-cropped-LOGO_CTO_HORIZ.png'
const DRAWER_WIDTH = 220

const NAV_SECTIONS = [
  {
    title: 'Conteúdo',
    items: [
      { to: ADMIN_ROUTES.pages, label: 'Páginas', icon: ArticleOutlinedIcon },
      { to: ADMIN_ROUTES.posts, label: 'Posts', icon: PostAddOutlinedIcon }
    ]
  },
  {
    title: 'Gerenciamento',
    items: [
      { to: ADMIN_ROUTES.messages, label: 'Mensagens', icon: MailOutlinedIcon, badgeKey: 'contactMessages' },
      { to: ADMIN_ROUTES.users, label: 'Usuários', icon: GroupOutlinedIcon },
      { to: ADMIN_ROUTES.centrals, label: 'Centrais', icon: LocationCityOutlinedIcon },
      { to: ADMIN_ROUTES.verifications, label: 'Verificações', icon: WaterDropOutlinedIcon }
    ]
  },
  {
    title: 'Análises',
    items: [{ to: ADMIN_ROUTES.dashboard, label: 'Dashboard', icon: DashboardOutlinedIcon }]
  }
]

function NavItem({ to, label, icon: Icon, onNavigate, badgeCount = 0 }) {
  const location = useLocation()
  const active = location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <ListItemButton
      component={Link}
      to={to}
      onClick={onNavigate}
      selected={active}
      sx={{
        mx: 1,
        mb: 0.5,
        borderRadius: 2,
        color: active ? '#fff' : 'rgba(255,255,255,0.85)',
        '&.Mui-selected': {
          bgcolor: 'rgba(60, 170, 89, 0.35)',
          borderLeft: '3px solid #46c969',
          '&:hover': { bgcolor: 'rgba(60, 170, 89, 0.45)' }
        },
        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
      }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
        <Badge
          badgeContent={badgeCount}
          color="error"
          overlap="circular"
          invisible={!badgeCount}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: 10,
              minWidth: 16,
              height: 16,
              fontWeight: 700
            }
          }}
        >
          <Icon fontSize="small" />
        </Badge>
      </ListItemIcon>
      <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 500 }} />
    </ListItemButton>
  )
}

function AdminDrawer({ onNavigate, unreadContactCount }) {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    onNavigate?.()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 1.5, py: 1.5, minHeight: 'auto !important' }}>
        <Stack spacing={0.75} alignItems="center" width="100%">
          <TerraImage
            src={LOGO_URL}
            alt="Terra Orgânica"
            priority
            inline
            showSkeleton={false}
            style={{ maxWidth: 150, filter: 'brightness(0) invert(1)' }}
            objectFit="contain"
          />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Painel Administrativo
          </Typography>
        </Stack>
      </Toolbar>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

      <Box className="admin-drawer-nav" sx={{ flex: 1, py: 2 }}>
        {NAV_SECTIONS.map((section) => (
          <Box key={section.title} sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              sx={{ px: 2.5, color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1.2 }}
            >
              {section.title}
            </Typography>
            <List disablePadding>
              {section.items.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  onNavigate={onNavigate}
                  badgeCount={item.badgeKey === 'contactMessages' ? unreadContactCount : 0}
                />
              ))}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

      <Box sx={{ p: 1.5 }}>
        {user ? (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1, px: 1 }}>
            {user.email}
          </Typography>
        ) : null}
        <List disablePadding>
          <ListItemButton
            component="a"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Ver site" primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
          <ListItemButton
            onClick={handleLogout}
            sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <ExitToAppIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Sair" primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  )
}

function AdminShell() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadContactCount, setUnreadContactCount] = useState(0)
  const location = useLocation()
  const isCanvas = useMatch('/admin/paginas/:id/editar')
  const isLogin = location.pathname === ADMIN_ROUTES.login

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await formsService.getUnreadCount()
      setUnreadContactCount(count)
    } catch {
      // ignore polling errors
    }
  }, [])

  useEffect(() => {
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [refreshUnreadCount])

  const closeMobile = () => setMobileOpen(false)

  if (isCanvas) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </Box>
    )
  }

  if (isLogin) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Outlet />
      </Box>
    )
  }

  const drawerSx = {
    width: DRAWER_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: DRAWER_WIDTH,
      boxSizing: 'border-box',
      background: 'linear-gradient(180deg, #0274be 0%, #025a96 55%, #1a4a6e 100%)',
      borderRight: 'none',
      color: '#fff'
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobile}
          ModalProps={{ keepMounted: true }}
          sx={drawerSx}
        >
          <AdminDrawer onNavigate={closeMobile} unreadContactCount={unreadContactCount} />
        </Drawer>
      ) : (
        <Drawer variant="permanent" sx={drawerSx}>
          <AdminDrawer unreadContactCount={unreadContactCount} />
        </Drawer>
      )}

      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {isMobile ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.5,
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <IconButton onClick={() => setMobileOpen(true)} edge="start" aria-label="Abrir menu">
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={600} color="primary.main">
              Terra Orgânica
            </Typography>
          </Box>
        ) : null}
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          <Outlet context={{ setUnreadContactCount, refreshUnreadContactCount: refreshUnreadCount }} />
        </Box>
      </Box>
    </Box>
  )
}

export default function EditorLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const isLogin = location.pathname === ADMIN_ROUTES.login

  if (loading) {
    return (
      <ThemeProvider theme={adminTheme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default'
          }}
        >
          <TerraLoader layout="fullscreen" size="lg" label="Carregando..." />
        </Box>
      </ThemeProvider>
    )
  }

  if (!user && !isLogin) {
    return <Navigate to={ADMIN_ROUTES.login} replace state={{ from: location }} />
  }

  if (user && !user.isAdministrator && !isLogin) {
    return <Navigate to={ADMIN_ROUTES.login} replace state={{ from: location, reason: 'not-admin' }} />
  }

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <AdminShell />
    </ThemeProvider>
  )
}

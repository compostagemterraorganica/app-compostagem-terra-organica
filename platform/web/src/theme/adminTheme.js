import { createTheme } from '@mui/material/styles'

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0274be',
      dark: '#025a96',
      light: '#3a9ad9',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#3CAA59',
      dark: '#2d8a45',
      light: '#46c969',
      contrastText: '#ffffff'
    },
    warning: {
      main: '#9D7B4E',
      dark: '#7a6039',
      light: '#b8956a'
    },
    error: {
      main: '#d32f2f'
    },
    background: {
      default: '#f6f8f7',
      paper: '#ffffff'
    },
    text: {
      primary: '#3a3a3a',
      secondary: '#6b7280'
    },
    divider: '#e5e7eb'
  },
  typography: {
    fontFamily: '"Raleway", "Open Sans", Arial, Helvetica, sans-serif',
    h1: { fontWeight: 700, color: '#3a3a3a' },
    h2: { fontWeight: 600, color: '#3a3a3a' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 }
  },
  shape: {
    borderRadius: 10
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' }
        },
        containedPrimary: {
          '&:hover': { backgroundColor: '#025a96' }
        },
        containedSecondary: {
          '&:hover': { backgroundColor: '#2d8a45' }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small'
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }
      }
    }
  }
})

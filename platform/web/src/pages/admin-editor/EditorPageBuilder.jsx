import grapesjs from 'grapesjs'
import gjsBlocksBasic from 'grapesjs-blocks-basic'
import gjsBlocksFlexbox from 'grapesjs-blocks-flexbox'
import gjsComponentCountdown from 'grapesjs-component-countdown'
import gjsCustomCode from 'grapesjs-custom-code'
import gjsNavbar from 'grapesjs-navbar'
import gjsParserPostcss from 'grapesjs-parser-postcss'
import gjsPluginExport from 'grapesjs-plugin-export'
import gjsPluginForms from 'grapesjs-plugin-forms'
import gjsPresetWebpage from 'grapesjs-preset-webpage'
import gjsStyleBg from 'grapesjs-style-bg'
import gjsTabs from 'grapesjs-tabs'
import gjsTouch from 'grapesjs-touch'
import gjsTooltip from 'grapesjs-tooltip'
import gjsTyped from 'grapesjs-typed'
import 'grapesjs/dist/css/grapes.min.css'
import 'react-toastify/ReactToastify.css'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckIcon from '@mui/icons-material/Check'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import TerraLoader from '../../components/TerraLoader'
import { cmsService } from '../../services/cmsService'
import grapesjsLayoutBlocks from './grapesjs-layout-blocks'
import {
  grapesAssetManagerConfig,
  loadGrapesMediaAssets
} from './grapesjs-media-upload'

function getActionErrorMessage(err, fallback) {
  const msg = err.response?.data?.error
  if (err.response?.status === 401) return 'Sessao expirada. Faca login novamente.'
  if (err.response?.status === 403) return msg || 'CSRF invalido. Recarregue a pagina e tente de novo.'
  return msg || fallback
}

function hasGrapesProject(json) {
  return json && typeof json === 'object' && Object.keys(json).length > 0
}

function applyVersionToEditor(editor, version) {
  if (!version) return

  if (hasGrapesProject(version.grapes_project_json)) {
    editor.loadProjectData(version.grapes_project_json)
    return
  }

  if (version.html_snapshot) {
    editor.setComponents(version.html_snapshot)
    editor.setStyle(version.css_snapshot || '')
  }
}

async function loadPageVersion(pageId) {
  try {
    return await cmsService.getLatestPageVersion(pageId)
  } catch {
    return cmsService.getPublicPageById(pageId)
  }
}

export default function EditorPageBuilder() {
  const { id } = useParams()
  const containerRef = useRef(null)
  const editorRef = useRef(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!id || !container) return undefined

    const editor = grapesjs.init({
      container,
      fromElement: false,
      height: '100%',
      width: 'auto',
      storageManager: false,
      assetManager: grapesAssetManagerConfig(),
      plugins: [
        gjsBlocksBasic,
        gjsBlocksFlexbox,
        grapesjsLayoutBlocks,
        gjsNavbar,
        gjsPluginForms,
        gjsComponentCountdown,
        gjsPluginExport,
        gjsTabs,
        gjsCustomCode,
        gjsTouch,
        gjsParserPostcss,
        gjsTooltip,
        gjsTyped,
        gjsStyleBg,
        gjsPresetWebpage
      ],
      pluginsOpts: {
        [gjsBlocksBasic]: {
          flexGrid: true,
          category: 'Basic'
        },
        [gjsBlocksFlexbox]: {
          flexboxBlock: { category: 'Layout' },
          stylePrefix: 'flex-'
        },
        [grapesjsLayoutBlocks]: {
          category: 'Layout'
        },
        [gjsNavbar]: {
          block: { category: 'Layout' }
        },
        [gjsPluginForms]: {
          category: 'Forms'
        },
        [gjsTabs]: {
          tabsBlock: { category: 'Extra' }
        },
        [gjsTyped]: {
          block: {
            category: 'Extra',
            content: {
              type: 'typed',
              'type-speed': 40,
              strings: ['Texto linha um', 'Texto linha dois', 'Texto linha tres']
            }
          }
        },
        [gjsPresetWebpage]: {
          showStylesOnChange: true,
          useCustomTheme: true,
          modalImportTitle: 'Importar template',
          modalImportButton: 'Importar',
          modalImportLabel: 'Cole aqui o HTML/CSS e clique em Importar',
          modalImportContent: (ed) => `${ed.getHtml()}<style>${ed.getCss()}</style>`,
          textCleanCanvas: 'Tem certeza que deseja limpar o canvas?',
          block: (blockId) => ({ category: 'Basic' })
        }
      },
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Raleway:wght@200;400;600;700&display=swap'
        ]
      }
    })
    editorRef.current = editor

    editor.on('asset:upload:error', (err) => {
      toast.error(getActionErrorMessage(err, 'Erro ao enviar imagem para o bucket.'))
    })

    let cancelled = false

    loadGrapesMediaAssets(editor)

    loadPageVersion(id)
      .then((version) => {
        if (!cancelled) applyVersionToEditor(editor, version)
      })
      .catch(() => {
        if (!cancelled) setStatus('Nao foi possivel carregar o conteudo da pagina.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      editor.destroy()
      editorRef.current = null
      container.innerHTML = ''
    }
  }, [id])

  const saveDraft = async ({ silent = false } = {}) => {
    const editor = editorRef.current
    if (!editor) return

    setSaving(true)
    try {
      const payload = {
        grapesProjectJson: editor.getProjectData(),
        htmlSnapshot: editor.getHtml(),
        cssSnapshot: editor.getCss()
      }
      await cmsService.createPageVersion(id, payload)
      await cmsService.updatePage(id, { status: 'draft' })
      if (!silent) toast.success('Rascunho salvo com sucesso!')
    } catch (err) {
      const message = getActionErrorMessage(err, 'Erro ao salvar rascunho.')
      if (!silent) toast.error(message)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    setPublishing(true)
    try {
      await saveDraft({ silent: true })
      await cmsService.publishPage(id)
      toast.success('Pagina publicada com sucesso!')
    } catch (err) {
      toast.error(getActionErrorMessage(err, 'Erro ao publicar a pagina.'))
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
          <Button
            component={Link}
            to="/admin/editor/pages"
            startIcon={<ArrowBackIcon />}
            color="primary"
            size="small"
          >
            Páginas
          </Button>
          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
            Página {id}
          </Typography>
          {loading ? <TerraLoader size="sm" layout="inline" label="Carregando..." /> : null}
          {!loading && status ? (
            <Typography variant="body2" color="text.secondary">
              {status}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={saving ? <TerraLoader size="sm" layout="inline" /> : <SaveOutlinedIcon />}
              onClick={() => saveDraft()}
              disabled={loading || saving || publishing}
            >
              {saving ? 'Salvando...' : 'Salvar rascunho'}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={publishing ? <TerraLoader size="sm" layout="inline" /> : <CheckIcon />}
              onClick={publish}
              disabled={loading || saving || publishing}
            >
              {publishing ? 'Publicando...' : 'Publicar'}
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Box ref={containerRef} sx={{ height: '100%', bgcolor: '#fff' }} />
        {loading ? <TerraLoader layout="overlay" size="lg" label="Carregando..." /> : null}
      </Box>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} closeOnClick />
    </Box>
  )
}

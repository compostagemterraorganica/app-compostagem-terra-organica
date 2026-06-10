import { cmsService } from '../../services/cmsService'

/**
 * Upload customizado do GrapesJS → POST /media/upload → GCS.
 * `this` = FileUploaderView do GrapesJS (bind automático).
 */
export function grapesUploadFileToGcs(ev, clb) {
  const files = ev.dataTransfer ? ev.dataTransfer.files : ev.target?.files
  if (!files?.length) return undefined

  this.onUploadStart()

  const uploads = [...files]
    .filter((file) => file.type.startsWith('image/'))
    .map(async (file) => {
      const asset = await cmsService.uploadImage(file)
      const src = asset.publicUrl || asset.url
      if (!src) throw new Error('URL publica ausente na resposta do upload')
      return { src, name: file.name, type: 'image' }
    })

  if (!uploads.length) {
    const err = new Error('Selecione um arquivo de imagem (JPG, PNG, WebP, etc.)')
    this.onUploadError(err)
    return Promise.reject(err)
  }

  return Promise.all(uploads)
    .then((data) => {
      this.onUploadResponse({ data }, clb)
      return { data }
    })
    .catch((err) => {
      this.onUploadError(err)
      throw err
    })
}

export function grapesAssetManagerConfig() {
  return {
    upload: false,
    embedAsBase64: false,
    autoAdd: true,
    multiUpload: true,
    uploadFile: grapesUploadFileToGcs
  }
}

export async function loadGrapesMediaAssets(editor) {
  try {
    const items = await cmsService.listMedia()
    const assets = items
      .map((item) => {
        const src = item.publicUrl || item.url
        const mime = item.mimeType || item.mime_type || ''
        if (!src || !mime.startsWith('image/')) return null
        return {
          src,
          name: item.originalName || item.original_name || `media-${item.id}`,
          type: 'image'
        }
      })
      .filter(Boolean)

    if (assets.length) editor.AssetManager.add(assets)
  } catch {
    // biblioteca de midia opcional se API indisponivel
  }
}

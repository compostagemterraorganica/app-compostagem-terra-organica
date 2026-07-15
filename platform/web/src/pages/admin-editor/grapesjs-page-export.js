export const GRAPES_DEVICE_MANAGER = {
  devices: [
    { id: 'desktop', name: 'Desktop', width: '' },
    { id: 'tablet', name: 'Tablet', width: '770px', widthMedia: '992px' },
    { id: 'mobileLandscape', name: 'Mobile landscape', width: '568px', widthMedia: '768px' },
    {
      id: 'mobilePortrait',
      name: 'Mobile portrait',
      width: '375px',
      widthMedia: '767px'
    }
  ]
}

export function exportPageCss(editor) {
  return editor.getCss({ keepUnusedStyles: true })
}

export function exportPageSnapshots(editor) {
  return {
    grapesProjectJson: editor.getProjectData(),
    htmlSnapshot: editor.getHtml(),
    cssSnapshot: exportPageCss(editor)
  }
}

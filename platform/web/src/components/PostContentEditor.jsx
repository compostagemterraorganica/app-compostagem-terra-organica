import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'
import { cmsService } from '../services/cmsService'
import { htmlForEditor, resolveMediaUrl } from '../lib/postContentHtml'
import './PostContentEditor.css'

function ToolbarButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      className={`post-editor-toolbar__btn${active ? ' post-editor-toolbar__btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

export default function PostContentEditor({ value, onChange, placeholder = 'Escreva o conteúdo do post...' }) {
  const fileInputRef = useRef(null)
  const isInternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder })
    ],
    content: htmlForEditor(value),
    onUpdate: ({ editor: ed }) => {
      if (isInternalUpdate.current) return
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'post-editor-content to-post-body'
      }
    }
  })

  useEffect(() => {
    if (!editor) return
    const next = htmlForEditor(value)
    const current = editor.getHTML()
    if (next !== current) {
      isInternalUpdate.current = true
      editor.commands.setContent(next, false)
      isInternalUpdate.current = false
    }
  }, [value, editor])

  const setLink = () => {
    if (!editor) return
    const previous = editor.getAttributes('link').href
    const url = window.prompt('URL do link', previous || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const uploadImage = async (file) => {
    const asset = await cmsService.uploadImage(file)
    const src = resolveMediaUrl(asset.publicUrl || asset.url)
    editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') }).run()
  }

  const handleImagePick = () => fileInputRef.current?.click()

  if (!editor) return null

  return (
    <div className="post-editor">
      <div className="post-editor-toolbar" role="toolbar" aria-label="Formatação do conteúdo">
        <ToolbarButton
          title="Negrito"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Itálico"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="Subtítulo (H2)"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Subtítulo menor (H3)"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <span className="post-editor-toolbar__sep" aria-hidden="true" />
        <ToolbarButton
          title="Lista com marcadores"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Lista
        </ToolbarButton>
        <ToolbarButton
          title="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. Lista
        </ToolbarButton>
        <ToolbarButton
          title="Citação"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          “
        </ToolbarButton>
        <span className="post-editor-toolbar__sep" aria-hidden="true" />
        <ToolbarButton title="Inserir link" active={editor.isActive('link')} onClick={setLink}>
          Link
        </ToolbarButton>
        <ToolbarButton title="Inserir imagem" onClick={handleImagePick}>
          Imagem
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              await uploadImage(file)
            } catch {
              window.alert('Não foi possível enviar a imagem.')
            }
          }}
        />
      </div>
      <EditorContent editor={editor} className="post-editor-surface" />
    </div>
  )
}

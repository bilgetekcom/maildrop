import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Heading2,
  Heading3,
  Strikethrough,
  Quote
} from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { cn } from '../../lib/utils'
import { useT } from '../../i18n'

interface ToolbarProps {
  editor: Editor | null
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed',
        active && 'bg-primary/10 text-primary'
      )}
    >
      {children}
    </button>
  )
}

export function EditorToolbar({ editor }: ToolbarProps): JSX.Element | null {
  const { t } = useT()
  if (!editor) return null

  function promptLink(): void {
    const prev = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt(t('templates.editor.linkPrompt'), prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
      <ToolbarButton
        title={t('templates.editor.toolbar.undo')}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('templates.editor.toolbar.redo')}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        title={t('templates.editor.toolbar.heading2')}
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('templates.editor.toolbar.heading3')}
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        title={t('templates.editor.toolbar.bold')}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('templates.editor.toolbar.italic')}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('templates.editor.toolbar.underline')}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleMark('underline' as never).run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('templates.editor.toolbar.strike')}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        title={t('templates.editor.toolbar.bulletList')}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('templates.editor.toolbar.orderedList')}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('templates.editor.toolbar.blockquote')}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        title={t('templates.editor.toolbar.link')}
        active={editor.isActive('link')}
        onClick={promptLink}
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

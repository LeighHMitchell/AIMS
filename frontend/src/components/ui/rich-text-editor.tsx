"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Link as LinkIcon,
  Undo,
  Redo
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { useEffect, useCallback, useRef } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  className,
  disabled = false
}: RichTextEditorProps) {
  // Track when we're setting content programmatically to avoid triggering onChange
  const isSettingContentRef = useRef(false)
  const lastPropContentRef = useRef(content)
  const isInitializedRef = useRef(false)
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const currentContent = editor.getHTML()
      
      // Only trigger onChange if this is a user-initiated change, not programmatic
      if (!isSettingContentRef.current && isInitializedRef.current) {
        // Additional check: ensure the content actually differs from what was set via props
        if (currentContent !== lastPropContentRef.current) {
          console.log('[RichTextEditor] User-initiated onChange triggered');
          onChange(currentContent)
        } else {
          console.log('[RichTextEditor] Content matches prop, ignoring onChange');
        }
      } else {
        console.log('[RichTextEditor] Programmatic onChange blocked', {
          isSettingContent: isSettingContentRef.current,
          isInitialized: isInitializedRef.current
        });
      }
    },
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        'data-placeholder': placeholder,
      },
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Set flag to indicate we're setting content programmatically
      isSettingContentRef.current = true
      lastPropContentRef.current = content
      editor.commands.setContent(content)
      // Use requestAnimationFrame to ensure the onUpdate has fired before resetting
      requestAnimationFrame(() => {
        isSettingContentRef.current = false
        // Mark as initialized after the first content setting
        isInitializedRef.current = true
      })
    }
  }, [content, editor])
  
  // Initialize the editor as ready after first render and track prop content
  useEffect(() => {
    if (editor) {
      lastPropContentRef.current = content
      // Small delay to ensure editor is fully initialized
      setTimeout(() => {
        isInitializedRef.current = true
      }, 100)
    }
  }, [editor, content])

  // Update editor editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
      
      // When enabling the editor, ensure it can be clicked anywhere
      if (!disabled) {
        // Force a re-render of the editor content area
        setTimeout(() => {
          const editorElement = editor.view.dom;
          if (editorElement) {
            // Ensure the editor is focusable and clickable
            editorElement.style.pointerEvents = "auto";
            editorElement.style.cursor = "text";
            
            // Force the editor to recalculate its click handlers
            editor.view.updateState(editor.state);
            
            // If the editor is empty, add a paragraph to make it clickable
            if (editor.isEmpty) {
              isSettingContentRef.current = true
              editor.commands.setContent("<p></p>");
              editor.commands.focus("start");
              requestAnimationFrame(() => {
                isSettingContentRef.current = false
              })
            }
          }
        }, 50);
      }
    }
  }, [disabled, editor])

  // Add click handler to make the entire editor area clickable
  const handleEditorClick = useCallback((event: React.MouseEvent) => {
    if (!editor || disabled) return;
    
    // Only handle clicks on the wrapper div itself (empty space)
    // Don't interfere with clicks on actual content
    const target = event.target as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;
    
    // Check if we clicked on the wrapper div directly (not on the editor content)
    if (target === currentTarget) {
      // If the editor is empty, ensure there's a paragraph to click into
      if (editor.isEmpty) {
        isSettingContentRef.current = true
        editor.commands.setContent("<p></p>");
        requestAnimationFrame(() => {
          isSettingContentRef.current = false
        })
      }
      
      // Focus the editor at the end of content when clicking empty space
      editor.commands.focus("end");
    }
    // If clicking on the editor content itself, let TipTap handle it naturally
    // This preserves text selection and cursor positioning
  }, [editor, disabled])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500", className)}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50 rounded-t-md">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          data-active={editor.isActive('italic')}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          data-active={editor.isActive('heading', { level: 1 })}
          aria-label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-active={editor.isActive('heading', { level: 2 })}
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          data-active={editor.isActive('heading', { level: 3 })}
          aria-label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive('bulletList')}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive('orderedList')}
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive('blockquote')}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={setLink}
          data-active={editor.isActive('link')}
          aria-label="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div 
        onClick={handleEditorClick}
        className="cursor-text min-h-[300px] relative"
      >
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none p-4 focus:outline-none [&_p]:my-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600"
        />
      </div>

      <style jsx global>{`
        .ProseMirror {
          outline: none !important;
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
          -moz-box-shadow: none !important;
          min-height: 260px !important;
          cursor: text !important;
        }
        
        .ProseMirror:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
          -moz-box-shadow: none !important;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }

        .ProseMirror[data-disabled="true"] {
          opacity: 0.6;
          pointer-events: none;
          background-color: #f8f9fa;
        }

        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }

        .ProseMirror a:hover {
          color: #1d4ed8;
        }

        .ProseMirror blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 1rem;
          font-style: italic;
          color: #6b7280;
          margin: 1rem 0;
        }

        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
        }

        .ProseMirror li {
          margin: 0.25rem 0;
        }

        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }

        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: 500;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror p {
          margin: 0.5rem 0;
        }

        /* Ensure disabled state styling */
        .ProseMirror[contenteditable="false"] {
          opacity: 0.6;
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        /* Make the entire editor area clickable when empty */
        .ProseMirror:empty::after {
          content: attr(data-placeholder);
          color: #adb5bd;
          pointer-events: none;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 1rem;
          display: flex;
          align-items: flex-start;
        }
      `}</style>
    </div>
  )
}

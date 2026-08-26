"use client";

import { useRef, useEffect, useCallback } from "react";
import { Bold, Italic, List } from "lucide-react";

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  helperText?: string;
}

/**
 * Minimal contentEditable-based rich text editor — no external dependency.
 * Outputs clean HTML (bold/italic/bullet list) suitable for the community
 * app's "instruction" field, which renders as formatted rich text on their
 * side. Optional field — leave blank and nothing is sent.
 */
export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Optional instructions for the devotee (e.g. arrival time, dress code)...",
  helperText,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Keep the DOM in sync when value is set/reset from outside (e.g. form reset)
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const exec = useCallback((command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    handleInput();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    // Strip a lone empty <br> that contentEditable leaves when fully cleared
    const html = editorRef.current.innerHTML;
    onChange(html === "<br>" ? "" : html);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          <span className="ml-1.5 text-xs text-gray-400 font-normal">(optional)</span>
        </label>
      )}
      <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("bold")}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("italic")}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("insertUnorderedList")}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
            title="Bullet list"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Editable area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          data-placeholder={placeholder}
          className="min-h-[90px] px-3 py-2 text-sm text-gray-900 focus:outline-none rich-text-editor-content"
          suppressContentEditableWarning
        />
      </div>
      {helperText && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}

      <style jsx global>{`
        .rich-text-editor-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-text-editor-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.25rem 0;
        }
        .rich-text-editor-content b,
        .rich-text-editor-content strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

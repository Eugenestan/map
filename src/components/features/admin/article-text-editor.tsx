"use client";

import { useRef } from "react";

interface ArticleTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

export function ArticleTextEditor({
  value,
  onChange,
  label,
  placeholder,
  rows = 5,
  required,
}: ArticleTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateSelection = (start: number, end: number) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  const toggleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    if (selectedText && before.endsWith("**") && after.startsWith("**")) {
      onChange(`${before.slice(0, -2)}${selectedText}${after.slice(2)}`);
      updateSelection(start - 2, end - 2);
      return;
    }

    if (selectedText.startsWith("**") && selectedText.endsWith("**") && selectedText.length > 4) {
      const unwrappedText = selectedText.slice(2, -2);
      onChange(`${before}${unwrappedText}${after}`);
      updateSelection(start, start + unwrappedText.length);
      return;
    }

    if (selectedText) {
      onChange(`${before}**${selectedText}**${after}`);
      updateSelection(start + 2, end + 2);
      return;
    }

    onChange(`${before}****${after}`);
    updateSelection(start + 2, start + 2);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBold}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
            aria-label="Сделать выделенный текст жирным"
            title="Жирный (Ctrl+B)"
          >
            B
          </button>
          <span className="hidden text-xs text-zinc-400 sm:inline">Ctrl/Cmd+B</span>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
            event.preventDefault();
            toggleBold();
          }
        }}
        rows={rows}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        placeholder={placeholder}
        required={required}
      />
      <p className="mt-1 text-xs text-zinc-400">Выделите текст и нажмите Ctrl/Cmd+B или кнопку B.</p>
    </div>
  );
}

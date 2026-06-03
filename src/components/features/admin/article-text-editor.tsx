"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { Bold, Heading2, Italic, LinkIcon, List, ListOrdered, Quote } from "lucide-react";

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

  const setEditorValue = (nextValue: string, selectionStart: number, selectionEnd: number) => {
    onChange(nextValue);
    updateSelection(selectionStart, selectionEnd);
  };

  const wrapSelection = (startToken: string, endToken = startToken, placeholder = "текст") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    if (selectedText && before.endsWith(startToken) && after.startsWith(endToken)) {
      setEditorValue(`${before.slice(0, -startToken.length)}${selectedText}${after.slice(endToken.length)}`, start - startToken.length, end - startToken.length);
      return;
    }

    if (selectedText.startsWith(startToken) && selectedText.endsWith(endToken) && selectedText.length > startToken.length + endToken.length) {
      const unwrappedText = selectedText.slice(startToken.length, -endToken.length);
      setEditorValue(`${before}${unwrappedText}${after}`, start, start + unwrappedText.length);
      return;
    }

    if (selectedText) {
      setEditorValue(`${before}${startToken}${selectedText}${endToken}${after}`, start + startToken.length, end + startToken.length);
      return;
    }

    setEditorValue(`${before}${startToken}${placeholder}${endToken}${after}`, start + startToken.length, start + startToken.length + placeholder.length);
  };

  const toggleLinePrefix = (prefix: string, fallbackText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const selectedBlock = value.slice(lineStart, end);
    const lines = selectedBlock.length > 0 ? selectedBlock.split("\n") : [fallbackText];
    const everyLineHasPrefix = lines.every((line) => line.trim().length === 0 || line.startsWith(prefix));
    const nextLines = everyLineHasPrefix
      ? lines.map((line) => (line.startsWith(prefix) ? line.slice(prefix.length) : line))
      : lines.map((line) => (line.trim().length === 0 ? line : `${prefix}${line}`));
    const nextBlock = nextLines.join("\n");

    setEditorValue(`${value.slice(0, lineStart)}${nextBlock}${value.slice(end)}`, lineStart, lineStart + nextBlock.length);
  };

  const toggleOrderedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const selectedBlock = value.slice(lineStart, end);
    const lines = selectedBlock.length > 0 ? selectedBlock.split("\n") : ["Пункт списка"];
    const orderedPattern = /^\d+\.\s/;
    const everyLineHasNumber = lines.every((line) => line.trim().length === 0 || orderedPattern.test(line));
    const nextLines = everyLineHasNumber
      ? lines.map((line) => line.replace(orderedPattern, ""))
      : lines.map((line, index) => (line.trim().length === 0 ? line : `${index + 1}. ${line}`));
    const nextBlock = nextLines.join("\n");

    setEditorValue(`${value.slice(0, lineStart)}${nextBlock}${value.slice(end)}`, lineStart, lineStart + nextBlock.length);
  };

  const toggleHeading = () => toggleLinePrefix("## ", "Заголовок");
  const toggleQuote = () => toggleLinePrefix("> ", "Цитата");
  const toggleBulletList = () => toggleLinePrefix("- ", "Пункт списка");
  const toggleBold = () => wrapSelection("**", "**", "жирный текст");
  const toggleItalic = () => wrapSelection("*", "*", "курсив");
  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end) || "текст ссылки";
    const nextText = `[${selectedText}](https://)`;

    setEditorValue(`${value.slice(0, start)}${nextText}${value.slice(end)}`, start + 1, start + 1 + selectedText.length);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
        <span className="hidden text-xs text-zinc-400 sm:inline">Markdown-разметка</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 bg-zinc-50 px-2 py-1.5">
          <ToolbarButton label="Заголовок" onClick={toggleHeading}>
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Жирный (Ctrl+B)" onClick={toggleBold}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Курсив (Ctrl+I)" onClick={toggleItalic}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Маркированный список" onClick={toggleBulletList}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Нумерованный список" onClick={toggleOrderedList}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Цитата" onClick={toggleQuote}>
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Ссылка (Ctrl+K)" onClick={insertLink}>
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && key === "b") {
              event.preventDefault();
              toggleBold();
            }
            if ((event.ctrlKey || event.metaKey) && key === "i") {
              event.preventDefault();
              toggleItalic();
            }
            if ((event.ctrlKey || event.metaKey) && key === "k") {
              event.preventDefault();
              insertLink();
            }
          }}
          rows={rows}
          className="w-full resize-y px-3 py-2 text-sm outline-none"
          placeholder={placeholder}
          required={required}
        />
      </div>
      <p className="mt-1 text-xs text-zinc-400">Выделите текст и нажмите кнопку на панели. Поддерживаются Ctrl/Cmd+B, Ctrl/Cmd+I и Ctrl/Cmd+K.</p>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md p-1.5 text-zinc-600 transition hover:bg-white hover:text-zinc-900 hover:shadow-sm"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

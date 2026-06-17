import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

function isEmojiBulletLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const firstChar = Array.from(trimmed)[0];
  return firstChar ? /\p{Extended_Pictographic}/u.test(firstChar) : false;
}

function renderInlineText(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const inlinePattern = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([\s\S]+?)\*\*|\*([^*\n]+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-700"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${match.index}`} className="font-semibold text-zinc-900">
          {match[4]}
        </strong>,
      );
    } else if (match[5]) {
      nodes.push(
        <em key={`${keyPrefix}-italic-${match.index}`} className="italic">
          {match[5]}
        </em>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function stripArticleFormatting(text: string) {
  return text
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1");
}

function renderParagraphLines(paragraphLines: string[], keyPrefix: string) {
  return paragraphLines.map((paragraphLine, lineIndex) => (
    <Fragment key={`${keyPrefix}-line-${lineIndex}`}>
      {lineIndex > 0 && <br />}
      {renderInlineText(paragraphLine.trim(), `${keyPrefix}-${lineIndex}`)}
    </Fragment>
  ));
}

export function FormattedText({ text, className }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h2 key={`heading-${index}`} className="text-xl font-semibold text-zinc-900">
          {renderInlineText(trimmed.slice(3), `heading-${index}`)}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${index}`} className="border-l-4 border-blue-200 pl-4 text-zinc-600">
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={`quote-${index}-${quoteIndex}`}>{renderInlineText(quoteLine, `quote-${index}-${quoteIndex}`)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^-\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`list-${index}`} className="list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`list-${index}-${itemIndex}`}>{renderInlineText(item, `list-${index}-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ordered-${index}`} className="list-decimal space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`ordered-${index}-${itemIndex}`}>{renderInlineText(item, `ordered-${index}-${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (isEmojiBulletLine(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && isEmojiBulletLine(lines[index])) {
        items.push(lines[index].trim());
        index += 1;
      }
      blocks.push(
        <ul key={`emoji-list-${index}`} className="list-none space-y-1">
          {items.map((item, itemIndex) => (
            <li key={`emoji-list-${index}-${itemIndex}`}>{renderInlineText(item, `emoji-list-${index}-${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const nextTrimmed = lines[index].trim();
      if (nextTrimmed.startsWith("## ") || nextTrimmed.startsWith("> ") || /^-\s+/.test(nextTrimmed) || /^\d+\.\s+/.test(nextTrimmed)) {
        break;
      }
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push(
      <p key={`paragraph-${index}`} className="leading-relaxed">
        {renderParagraphLines(paragraphLines, `paragraph-${index}`)}
      </p>,
    );
  }

  return <div className={cn("space-y-3", className)}>{blocks.length > 0 ? blocks : text}</div>;
}

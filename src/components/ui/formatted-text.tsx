import type { ReactNode } from "react";

function renderBoldText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldPattern = /\*\*([\s\S]+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      <strong key={`bold-${match.index}`} className="font-semibold text-zinc-900">
        {match[1]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function stripArticleFormatting(text: string) {
  return text.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
}

export function FormattedText({ text, className }: { text: string; className?: string }) {
  return <p className={className}>{renderBoldText(text)}</p>;
}

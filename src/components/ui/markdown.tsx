import { Fragment, type ReactNode } from 'react';

/**
 * A deliberately tiny, dependency-free markdown renderer for knowledge-base
 * article bodies. It builds React elements directly (never dangerouslySet-
 * InnerHTML), so untrusted article text can't inject markup — the only HTML
 * that ever renders is the fixed set of elements below. Supports headings
 * (#/##/###), unordered (-/*) and ordered (1.) lists, blockquotes (>), fenced
 * code blocks (```), horizontal rules (---), and inline **bold** / *italic* /
 * `code`. Anything it doesn't recognise renders as a plain paragraph.
 */

function renderInline(text: string): ReactNode[] {
  // Split on the inline markers, keeping the delimiters so we can wrap them.
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={i}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-(--surface-2) px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return <em key={i}>{token.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{token}</Fragment>;
  });
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;
  let paragraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(
        <p key={key++} className="leading-relaxed text-(--text-secondary)">
          {renderInline(paragraph.join(' '))}
        </p>,
      );
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((item, i) => <li key={i}>{renderInline(item)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={key++} className="ml-5 list-decimal space-y-1 text-(--text-secondary)">
            {items}
          </ol>
        ) : (
          <ul key={key++} className="ml-5 list-disc space-y-1 text-(--text-secondary)">
            {items}
          </ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Fenced code block toggles.
    if (line.trimStart().startsWith('```')) {
      if (code) {
        blocks.push(
          <pre key={key++} className="overflow-x-auto rounded-md bg-(--surface-2) p-3 text-sm">
            <code className="font-mono">{code.join('\n')}</code>
          </pre>,
        );
        code = null;
      } else {
        flushParagraph();
        flushList();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(raw);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (line === '---' || line === '***') {
      flushParagraph();
      flushList();
      blocks.push(<hr key={key++} className="border-(--border-subtle)" />);
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const text = renderInline(heading[2]);
      if (level === 1) blocks.push(<h2 key={key++} className="mt-4 text-xl font-semibold text-(--text-primary)">{text}</h2>);
      else if (level === 2) blocks.push(<h3 key={key++} className="mt-3 text-lg font-semibold text-(--text-primary)">{text}</h3>);
      else blocks.push(<h4 key={key++} className="mt-2 text-base font-semibold text-(--text-primary)">{text}</h4>);
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-accent-500 pl-3 italic text-(--text-tertiary)">
          {renderInline(line.slice(2))}
        </blockquote>,
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    if (ordered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  if (code) {
    blocks.push(
      <pre key={key++} className="overflow-x-auto rounded-md bg-(--surface-2) p-3 text-sm">
        <code className="font-mono">{code.join('\n')}</code>
      </pre>,
    );
  }

  return <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>{blocks}</div>;
}

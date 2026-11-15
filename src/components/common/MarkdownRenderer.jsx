import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Split content into blocks (code blocks vs text blocks)
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.substring(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'text',
      value: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.substring(lastIndex),
    });
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-200 break-words">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return <CodeBlock key={index} language={part.language} code={part.value} />;
        }
        return <TextBlock key={index} text={part.value} />;
      })}
    </div>
  );
};

const CodeBlock = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950/80 font-mono text-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-slate-200 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-3 overflow-x-auto">
        <pre className="text-slate-200 leading-normal font-mono">{code}</pre>
      </div>
    </div>
  );
};

const TextBlock = ({ text }) => {
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null; // 'ul' or 'ol'
  let tableRows = [];
  let inTable = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1.5 my-2 ml-1 text-slate-200">
            {currentList.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                <InlineText text={item} />
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-1.5 my-2 ml-1 text-slate-200">
            {currentList.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                <InlineText text={item} />
              </li>
            ))}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(2); // Skip separator row

      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-slate-700/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/90 text-slate-200 border-b border-slate-700">
              <tr>
                {header.map((col, idx) => (
                  <th key={idx} className="px-3.5 py-2 font-semibold">
                    <InlineText text={col.trim()} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-900/30">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-slate-300">
                      <InlineText text={cell.trim()} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed.split('|').slice(1, -1);
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={i} className="text-base font-bold text-slate-100 mt-4 mb-1.5 tracking-tight">
          <InlineText text={trimmed.substring(4)} />
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={i} className="text-lg font-bold text-slate-100 mt-4 mb-2 tracking-tight">
          <InlineText text={trimmed.substring(3)} />
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={i} className="text-xl font-bold text-slate-100 mt-5 mb-2 tracking-tight">
          <InlineText text={trimmed.substring(2)} />
        </h2>
      );
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentList.push(trimmed.substring(2));
      continue;
    }

    // Ordered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentList.push(numMatch[2]);
      continue;
    }

    // Normal paragraph line
    flushList();
    elements.push(
      <p key={i} className="leading-relaxed">
        <InlineText text={trimmed} />
      </p>
    );
  }

  flushList();
  flushTable();

  return <>{elements}</>;
};

const InlineText = ({ text }) => {
  if (!text) return null;

  // Match bold **text** or inline `code`
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-semibold text-slate-100">
              {part.substring(2, part.length - 2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[12px] border border-slate-700">
              {part.substring(1, part.length - 1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
};

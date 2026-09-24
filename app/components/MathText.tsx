"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface MathTextProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export function MathText({ content, className = "", inline = false }: MathTextProps) {
  const renderedContent = useMemo(() => {
    if (!content) return "";

    // Regex untuk membedakan block math $$...$$ dan inline math $...$
    // Juga mendukung \[...\] dan \(...\)
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;

    const parts = content.split(mathRegex);

    return parts.map((part, index) => {
      if (!part) return null;

      // 1. Block Math ($$...$$ atau \[...\])
      if (
        (part.startsWith("$$") && part.endsWith("$$")) ||
        (part.startsWith("\\[") && part.endsWith("\\]"))
      ) {
        const math = part.startsWith("$$")
          ? part.slice(2, -2)
          : part.slice(2, -2);
        try {
          const html = katex.renderToString(math.trim(), {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="my-2 block overflow-x-auto py-1"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index}>{part}</span>;
        }
      }

      // 2. Inline Math ($...$ atau \(...\))
      if (
        (part.startsWith("$") && part.endsWith("$")) ||
        (part.startsWith("\\(") && part.endsWith("\\)"))
      ) {
        const math = part.startsWith("$")
          ? part.slice(1, -1)
          : part.slice(2, -2);
        try {
          const html = katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="inline-block px-0.5 align-baseline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index}>{part}</span>;
        }
      }

      // 3. Teks biasa
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  }, [content]);

  if (inline) {
    return <span className={className}>{renderedContent}</span>;
  }

  return <div className={className}>{renderedContent}</div>;
}

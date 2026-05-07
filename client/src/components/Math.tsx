/**
 * Math.tsx — KaTeX inline and block math renderer
 * Usage:
 *   <Math tex="\lambda x. x" />           — inline
 *   <Math tex="\lambda x. x" block />     — display block
 */

import { useMemo } from 'react';
import katex from 'katex';

interface MathProps {
  tex: string;
  block?: boolean;
  className?: string;
}

export default function Math({ tex, block = false, className = '' }: MathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: block,
        throwOnError: false,
        trust: false,
        strict: 'ignore',
      });
    } catch {
      return `<span style="color:#c62828">${tex}</span>`;
    }
  }, [tex, block]);

  if (block) {
    return (
      <div
        className={`overflow-x-auto py-2 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

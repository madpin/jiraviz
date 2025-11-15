import { useMemo } from 'react';
import { convertADFToHTML } from '../utils/adfFormatter';

interface FormattedTextProps {
  content: string | any;
  className?: string;
  isADF?: boolean;
}

/**
 * Component to render formatted text from Jira (ADF format) with preserved formatting
 */
export function FormattedText({ content, className = '', isADF = false }: FormattedTextProps) {
  const formattedHTML = useMemo(() => {
    if (!content) return '';
    
    // If it's already ADF format (object), convert it
    if (isADF && typeof content === 'object') {
      return convertADFToHTML(content);
    }
    
    // If it's a string, check if it might be plain text or HTML
    if (typeof content === 'string') {
      // If the string contains HTML tags, return as-is
      if (content.includes('<') && content.includes('>')) {
        return content;
      }
      // Otherwise, wrap plain text in paragraph and preserve line breaks
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => `<p>${escapeHtml(line)}</p>`)
        .join('');
    }
    
    return '';
  }, [content, isADF]);

  if (!formattedHTML) {
    return (
      <p className={`text-gray-500 dark:text-gray-400 italic ${className}`}>
        No content provided
      </p>
    );
  }

  return (
    <div
      className={`formatted-text prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: formattedHTML }}
    />
  );
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}


/**
 * Converts Atlassian Document Format (ADF) to HTML with preserved formatting
 */

interface ADFNode {
  type: string;
  content?: ADFNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: any }>;
  attrs?: any;
}

export function convertADFToHTML(adf: any): string {
  if (!adf || !adf.content) return '';
  
  let html = '';
  
  const processNode = (node: ADFNode): string => {
    if (!node) return '';
    
    switch (node.type) {
      case 'text':
        return processTextNode(node);
      
      case 'paragraph': {
        const paragraphContent = node.content ? node.content.map(processNode).join('') : '';
        return paragraphContent ? `<p>${paragraphContent}</p>` : '<p><br /></p>';
      }
      
      case 'heading': {
        const level = node.attrs?.level || 1;
        const headingContent = node.content ? node.content.map(processNode).join('') : '';
        return `<h${level}>${headingContent}</h${level}>`;
      }
      
      case 'bulletList': {
        const bulletItems = node.content ? node.content.map(processNode).join('') : '';
        return `<ul>${bulletItems}</ul>`;
      }
      
      case 'orderedList': {
        const orderedItems = node.content ? node.content.map(processNode).join('') : '';
        return `<ol>${orderedItems}</ol>`;
      }
      
      case 'listItem': {
        const listItemContent = node.content ? node.content.map(processNode).join('') : '';
        return `<li>${listItemContent}</li>`;
      }
      
      case 'codeBlock': {
        const language = node.attrs?.language || '';
        const codeContent = node.content ? node.content.map(n => n.text || '').join('') : '';
        return `<pre><code class="language-${language}">${escapeHtml(codeContent)}</code></pre>`;
      }
      
      case 'blockquote': {
        const quoteContent = node.content ? node.content.map(processNode).join('') : '';
        return `<blockquote>${quoteContent}</blockquote>`;
      }
      
      case 'rule':
        return '<hr />';
      
      case 'hardBreak':
        return '<br />';
      
      case 'inlineCard':
      case 'blockCard': {
        const url = node.attrs?.url || '#';
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
      }
      
      case 'media':
      case 'mediaGroup':
      case 'mediaSingle': {
        // Handle images and media
        const mediaUrl = node.attrs?.url || node.attrs?.id || '';
        return mediaUrl ? `<img src="${escapeHtml(mediaUrl)}" alt="Media" />` : '';
      }
      
      case 'table': {
        const tableContent = node.content ? node.content.map(processNode).join('') : '';
        return `<table>${tableContent}</table>`;
      }
      
      case 'tableRow': {
        const rowContent = node.content ? node.content.map(processNode).join('') : '';
        return `<tr>${rowContent}</tr>`;
      }
      
      case 'tableHeader': {
        const headerContent = node.content ? node.content.map(processNode).join('') : '';
        return `<th>${headerContent}</th>`;
      }
      
      case 'tableCell': {
        const cellContent = node.content ? node.content.map(processNode).join('') : '';
        return `<td>${cellContent}</td>`;
      }
      
      case 'panel': {
        const panelContent = node.content ? node.content.map(processNode).join('') : '';
        const panelType = node.attrs?.panelType || 'info';
        return `<div class="panel panel-${panelType}">${panelContent}</div>`;
      }
      
      case 'taskList': {
        const taskItems = node.content ? node.content.map(processNode).join('') : '';
        return `<ul class="task-list">${taskItems}</ul>`;
      }
      
      case 'taskItem': {
        const checked = node.attrs?.state === 'DONE';
        const taskContent = node.content ? node.content.map(processNode).join('') : '';
        return `<li class="task-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled />${taskContent}</li>`;
      }
      
      case 'mention': {
        const mentionName = node.attrs?.text || node.attrs?.displayName || '@user';
        return `<span class="mention">${escapeHtml(mentionName)}</span>`;
      }
      
      case 'emoji': {
        const emojiShortName = node.attrs?.shortName || '';
        const emojiText = node.attrs?.text || emojiShortName;
        return escapeHtml(emojiText);
      }
      
      case 'date': {
        const timestamp = node.attrs?.timestamp;
        if (timestamp) {
          const date = new Date(parseInt(timestamp));
          return escapeHtml(date.toLocaleDateString());
        }
        return '';
      }
      
      case 'status': {
        const statusText = node.attrs?.text || '';
        const color = node.attrs?.color || 'neutral';
        return `<span class="status status-${color}">${escapeHtml(statusText)}</span>`;
      }
      
      default:
        // For unknown types, try to process content if available
        if (node.content) {
          return node.content.map(processNode).join('');
        }
        return '';
    }
  };
  
  const processTextNode = (node: ADFNode): string => {
    let text = escapeHtml(node.text || '');
    
    if (node.marks && node.marks.length > 0) {
      // Apply marks (formatting) in order
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'strong':
            text = `<strong>${text}</strong>`;
            break;
          case 'em':
            text = `<em>${text}</em>`;
            break;
          case 'code':
            text = `<code>${text}</code>`;
            break;
          case 'strike':
            text = `<del>${text}</del>`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
          case 'subsup': {
            const type = mark.attrs?.type;
            if (type === 'sub') {
              text = `<sub>${text}</sub>`;
            } else if (type === 'sup') {
              text = `<sup>${text}</sup>`;
            }
            break;
          }
          case 'link': {
            const href = mark.attrs?.href || '#';
            const title = mark.attrs?.title || '';
            text = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${title ? ` title="${escapeHtml(title)}"` : ''}>${text}</a>`;
            break;
          }
          case 'textColor': {
            const color = mark.attrs?.color || '';
            if (color) {
              text = `<span style="color: ${escapeHtml(color)}">${text}</span>`;
            }
            break;
          }
        }
      }
    }
    
    return text;
  };
  
  html = adf.content.map(processNode).join('');
  return html;
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

/**
 * Extracts plain text from ADF (fallback for when HTML rendering isn't needed)
 */
export function extractTextFromADF(adf: any): string {
  if (!adf || !adf.content) return '';

  let text = '';
  const extractFromNode = (node: any, depth: number = 0): void => {
    if (node.type === 'text') {
      text += node.text;
    } else if (node.type === 'hardBreak') {
      text += '\n';
    } else if (node.type === 'paragraph') {
      if (node.content) {
        node.content.forEach((n: any) => extractFromNode(n, depth));
      }
      text += '\n\n';
    } else if (node.type === 'heading') {
      if (node.content) {
        node.content.forEach((n: any) => extractFromNode(n, depth));
      }
      text += '\n\n';
    } else if (node.type === 'listItem') {
      text += '• ';
      if (node.content) {
        node.content.forEach((n: any) => extractFromNode(n, depth + 1));
      }
    } else if (node.type === 'codeBlock') {
      if (node.content) {
        node.content.forEach((n: any) => extractFromNode(n, depth));
      }
      text += '\n\n';
    } else if (node.content) {
      node.content.forEach((n: any) => extractFromNode(n, depth));
    }
  };

  adf.content.forEach((node: any) => extractFromNode(node));
  return text.trim();
}


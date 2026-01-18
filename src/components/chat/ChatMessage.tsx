import { typography } from '../../utils/typography';
import { ReactNode } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

// Map of keywords to their URLs (ordered by length desc to match longer phrases first)
const linkMap: { keyword: string; url: string }[] = [
  { keyword: 'Beyond the Assessment', url: 'https://altivum.ai/bta' },
  { keyword: 'The Vector Podcast', url: 'https://www.youtube.com/@AltivumPress' },
  { keyword: 'Vector Podcast', url: 'https://www.youtube.com/@AltivumPress' },
  { keyword: 'Altivum Inc', url: 'https://altivum.ai' },
  { keyword: 'Altivum', url: 'https://altivum.ai' },
  { keyword: 'VetROI', url: 'https://vetroi.altivum.ai' },
];

/**
 * Process text content and replace keywords with hyperlinks
 */
function processContentWithLinks(content: string): ReactNode[] {
  const result: ReactNode[] = [];
  let remainingText = content;
  let keyIndex = 0;

  while (remainingText.length > 0) {
    // Find the earliest match among all keywords
    let earliestMatch: { index: number; keyword: string; url: string } | null = null;

    for (const { keyword, url } of linkMap) {
      const index = remainingText.toLowerCase().indexOf(keyword.toLowerCase());
      if (index !== -1 && (earliestMatch === null || index < earliestMatch.index)) {
        // Get the actual text from the content (preserves original casing)
        const actualKeyword = remainingText.substring(index, index + keyword.length);
        earliestMatch = { index, keyword: actualKeyword, url };
      }
    }

    if (earliestMatch) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        result.push(remainingText.substring(0, earliestMatch.index));
      }

      // Add the link
      result.push(
        <a
          key={`link-${keyIndex++}`}
          href={earliestMatch.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-altivum-gold/50 hover:decoration-altivum-gold transition-colors"
        >
          {earliestMatch.keyword}
        </a>
      );

      // Continue with remaining text
      remainingText = remainingText.substring(earliestMatch.index + earliestMatch.keyword.length);
    } else {
      // No more matches, add the rest of the text
      result.push(remainingText);
      break;
    }
  }

  return result;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === 'user';

  // Only process links for assistant messages
  const displayContent = isUser ? content : processContentWithLinks(content);

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div
        className={`max-w-[90%] md:max-w-[80%] px-5 py-4 ${
          isUser
            ? 'bg-white/5 border border-white/30 rounded-2xl rounded-br-sm'
            : 'bg-white/5 border border-altivum-gold/30 rounded-2xl rounded-bl-sm'
        }`}
      >
        <p
          className={isUser ? 'text-white' : 'text-altivum-gold'}
          style={typography.bodyText}
        >
          {displayContent}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;

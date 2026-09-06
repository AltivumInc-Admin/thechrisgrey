import { memo } from 'react';

/**
 * Starter chips. `suggestions` is required on purpose: pageContext.ts (fed by the
 * canonical ROUTES table) is the single source of this copy, and every call site
 * resolves it through getSuggestionsForPage, which always returns a non-empty
 * list. A component-level default would be unreachable and would quietly become
 * a second, divergent source of user-facing copy.
 */
interface ChatSuggestionsProps {
  onSelect: (suggestion: string) => void;
  suggestions: string[];
}

const ChatSuggestions = memo(({ onSelect, suggestions }: ChatSuggestionsProps) => {
  return (
    <div className="flex flex-wrap gap-3 justify-center px-4 py-6">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="px-4 py-2 border border-white/10 rounded-full text-altivum-silver hover:text-white hover:bg-white/5 transition-all duration-200 text-sm touch-manipulation"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
});

ChatSuggestions.displayName = 'ChatSuggestions';

export default ChatSuggestions;

import { useNavigate } from 'react-router-dom';
import { useFocusTrap, useChatEngine, usePageContext } from '../../hooks';
import { typography } from '../../utils/typography';
import { getSuggestionsForPage } from '../../utils/pageContext';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSuggestions from './ChatSuggestions';
import TypingIndicator from './TypingIndicator';
import Icon from '../icons/Icon';

interface ChatWidgetPanelProps {
  onClose: () => void;
}

const ChatWidgetPanel = ({ onClose }: ChatWidgetPanelProps) => {
  const navigate = useNavigate();
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const pageContext = usePageContext();
  const contextualSuggestions = getSuggestionsForPage(pageContext.currentPage);

  const {
    messages,
    isTyping,
    isStreaming,
    streamingMessageId,
    messagesContainerRef,
    hasUserMessages,
    showSuggestions,
    handleSend,
    handleClearConversation,
    handleSuggestionSelect,
  } = useChatEngine(pageContext);

  const handleExpand = () => {
    onClose();
    navigate('/chat');
  };

  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    handleKeyDown(e);
  };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50 sm:hidden" onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        onKeyDown={handlePanelKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Alti - Altivum's AI Agent"
        className="fixed bottom-24 right-6 z-40 w-[calc(100vw-2rem)] h-[calc(100vh-8rem)] sm:w-[400px] sm:h-[560px] bg-altivum-navy border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-widget-open"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-altivum-dark/60 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-white text-sm" style={typography.smallText}>
              Alti<sup className="text-[8px]">TM</sup>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {hasUserMessages && (
              <button
                onClick={handleClearConversation}
                className="p-1.5 text-altivum-silver hover:text-white rounded-sm transition-colors duration-200"
                aria-label="Clear conversation"
              >
                <Icon name="refresh" className="text-lg" />
              </button>
            )}
            <button
              onClick={handleExpand}
              className="p-1.5 text-altivum-silver hover:text-white rounded-sm transition-colors duration-200"
              aria-label="Open full chat"
            >
              <Icon name="open_in_full" className="text-lg" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-altivum-silver hover:text-white rounded-sm transition-colors duration-200"
              aria-label="Close chat"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto" data-lenis-prevent>
          <div className="px-4 py-4">
            <div className="space-y-4" role="log" aria-live="polite" aria-label="Chat messages">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  isStreaming={message.id === streamingMessageId}
                  isSystem={message.isSystem}
                  drafts={message.drafts}
                  toolActivity={message.toolActivity}
                  memoryEvents={message.memoryEvents}
                  surface="widget"
                />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          </div>

          {showSuggestions && <ChatSuggestions onSelect={handleSuggestionSelect} suggestions={contextualSuggestions} />}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isTyping || isStreaming} />
      </div>
    </>
  );
};

export default ChatWidgetPanel;

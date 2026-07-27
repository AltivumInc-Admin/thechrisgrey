import { useCallback, useRef } from 'react';
import { SEO } from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import { typography } from '../utils/typography';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput, { type ChatInputHandle } from '../components/chat/ChatInput';
import ChatSuggestions from '../components/chat/ChatSuggestions';
import CapabilityIntro from '../components/chat/CapabilityIntro';
import TypingIndicator from '../components/chat/TypingIndicator';
import ErrorBoundary from '../components/ErrorBoundary';
import { ChatErrorFallback } from '../components/ErrorFallbacks';
import { useChatEngine, usePageContext, CHAT_STORAGE_KEY } from '../hooks';
import { getSuggestionsForPage } from '../utils/pageContext';
import Icon from '../components/icons/Icon';

const breadcrumbs = [
  { name: 'Home', url: 'https://thechrisgrey.com' },
  { name: 'Alti', url: 'https://thechrisgrey.com/chat' },
];

const ChatContent = () => {
  const pageContext = usePageContext();
  // /chat starter chips are context-specific (tool-powered prompts declared on
  // the /chat route in routes.ts), not the generic DEFAULT_SUGGESTIONS fallback
  // (VAL-ENG-011). getSuggestionsForPage resolves the /chat entry directly.
  const chatSuggestions = getSuggestionsForPage(pageContext.currentPage);
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
    handleForgetMemory,
  } = useChatEngine(pageContext);

  const chatInputRef = useRef<ChatInputHandle>(null);
  const handleUseExample = useCallback((example: string) => {
    chatInputRef.current?.prefill(example);
  }, []);

  const onForget = async () => {
    const confirmed = window.confirm(
      'Forget everything you told Alti? This deletes your saved facts and cannot be undone.',
    );
    if (!confirmed) return;
    const result = await handleForgetMemory();
    if (result.ok) {
      window.alert(`Cleared. ${result.deleted ?? 0} saved item(s) removed.`);
    } else {
      window.alert(`Unable to clear right now: ${result.error || 'Unknown error.'}`);
    }
  };

  return (
    <div className="h-screen pt-20 flex flex-col bg-altivum-dark overflow-hidden">
      <SEO
        title="Alti - Altivum's AI Agent"
        description="Meet Alti, Altivum's AI agent. Have a conversation about Christian Perez's journey from Green Beret to tech founder, Altivum Inc, The Vector Podcast, and more."
        keywords="Alti, AI agent, Christian Perez, conversation, Altivum, veteran entrepreneur"
        url="https://thechrisgrey.com/chat"
        breadcrumbs={breadcrumbs}
        noindex={true}
      />

      {/* Header */}
      <div className="border-b border-white/10 bg-altivum-dark/80 backdrop-blur-xs">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-start justify-between">
          <div>
            {/* Visible breadcrumb trail — mirrors the BreadcrumbList JSON-LD
                emitted by <SEO> above. Sits above the Alti heading so the
                current-page crumb anchors the visitor within the site. */}
            <Breadcrumbs items={breadcrumbs} className="mb-3" />
            <h1 className="text-white mb-2" style={typography.cardTitleLarge}>
              Alti<sup className="text-xs">TM</sup>
            </h1>
            <p className="text-altivum-silver" style={typography.smallText}>
              Ask me anything about Christian, Altivum, the podcast, or his book.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasUserMessages && (
              <button
                onClick={handleClearConversation}
                className="flex items-center gap-2 px-4 py-2 text-altivum-silver hover:text-white border border-white/20 hover:border-white/40 rounded-sm transition-colors duration-200 text-sm"
                aria-label="Clear conversation"
              >
                <Icon name="refresh" className="text-base" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={onForget}
              className="flex items-center gap-2 px-4 py-2 text-altivum-silver hover:text-white border border-white/20 hover:border-white/40 rounded-sm transition-colors duration-200 text-sm"
              aria-label="Forget what I told Alti"
            >
              <Icon name="delete_sweep" className="text-base" />
              <span className="hidden sm:inline">Forget me</span>
            </button>
          </div>
        </div>
      </div>

      {/* Capability rail — surfaces Alti's tool-driven powers without forcing trial-and-error.
          Initially expanded on cold start (no user messages yet) so first-time visitors
          discover it; collapses to a one-line chip the moment they engage. */}
      <CapabilityIntro onUseExample={handleUseExample} initiallyExpanded={showSuggestions} />

      {/* Messages Container — data-lenis-prevent lets this inner scroller take the
          wheel/touch natively; without it site-wide Lenis hijacks the gesture and the
          conversation can't be scrolled (the page wrapper is overflow-hidden). */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto" data-lenis-prevent>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-6" role="log" aria-live="polite" aria-label="Chat messages">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={message.id === streamingMessageId}
                isSystem={message.isSystem}
                drafts={message.drafts}
                uiBlocks={message.uiBlocks}
                toolActivity={message.toolActivity}
                memoryEvents={message.memoryEvents}
                surface="page"
              />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="max-w-4xl mx-auto">
            <ChatSuggestions onSelect={handleSuggestionSelect} suggestions={chatSuggestions} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput ref={chatInputRef} onSend={handleSend} disabled={isTyping || isStreaming} />
    </div>
  );
};

// Clear chat storage on error reset
const handleChatErrorReset = () => {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
    window.sessionStorage.removeItem('chat-typing');
  }
};

const Chat = () => {
  return (
    <ErrorBoundary
      fallback={<ChatErrorFallback onRetry={handleChatErrorReset} />}
      onReset={handleChatErrorReset}
      showHomeButton={false}
      pageName="Chat"
    >
      <ChatContent />
    </ErrorBoundary>
  );
};

export default Chat;

import { useState, useRef, useEffect } from 'react';
import { SEO } from '../components/SEO';
import { typography } from '../utils/typography';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import ChatSuggestions from '../components/chat/ChatSuggestions';
import TypingIndicator from '../components/chat/TypingIndicator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT;

const initialWelcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hey there! I'm Christian's Personal AI Assistant here to help you learn more about him. Feel free to ask about his background, Altivum® Inc, The Vector Podcast, or his book \"Beyond the Assessment.\" What would you like to know?",
  timestamp: new Date(),
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([initialWelcomeMessage]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    // Scroll within the messages container, not the whole page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    // Only scroll to bottom after user has sent a message
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages, isTyping]);

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setShowSuggestions(false);
    setIsTyping(true);

    // Prepare conversation history for API (excluding welcome message)
    const conversationHistory = [...messages.filter(m => m.id !== 'welcome'), userMessage].map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Create placeholder for assistant response
    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);
    setIsTyping(false);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;

          if (result.value) {
            const chunk = decoder.decode(result.value, { stream: true });

            // Append chunk to the assistant message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  'I apologize, but I encountered an error. Please try again.',
              }
            : msg
        )
      );
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    handleSend(suggestion);
  };

  return (
    <div className="h-screen pt-20 flex flex-col bg-altivum-dark overflow-hidden">
      <SEO
        title="AI Chat"
        description="Have a conversation with an AI assistant trained on Christian Perez's background, work, and expertise. Learn about his journey from Green Beret to tech CEO."
        keywords="AI chat, Christian Perez, conversation, Altivum, veteran entrepreneur"
        url="https://thechrisgrey.com/chat"
        breadcrumbs={[
          { name: "Home", url: "https://thechrisgrey.com" },
          { name: "AI Chat", url: "https://thechrisgrey.com/chat" }
        ]}
      />

      {/* Header */}
      <div className="border-b border-white/10 bg-altivum-dark/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-white mb-2" style={typography.cardTitleLarge}>
            AI Chat
          </h1>
          <p className="text-altivum-silver" style={typography.smallText}>
            Ask me anything about Christian's background, Altivum, the podcast, or his book.
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="max-w-4xl mx-auto">
            <ChatSuggestions onSelect={handleSuggestionSelect} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
};

export default Chat;

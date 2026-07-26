import { useState, useRef, useEffect, useImperativeHandle, KeyboardEvent, FormEvent, Ref } from 'react';
import Icon from '../icons/Icon';

export interface ChatInputHandle {
  /** Fill the input with the given text, focus it, and place the caret at the end. Does not send. */
  prefill: (value: string) => void;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  ref?: Ref<ChatInputHandle>;
}

const ChatInput = ({ onSend, disabled = false, ref }: ChatInputProps) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      prefill: (newValue: string) => {
        setValue(newValue);
        // Defer focus + caret-to-end until after React commits the new value to the DOM.
        requestAnimationFrame(() => {
          const ta = textareaRef.current;
          if (!ta) return;
          ta.focus();
          const len = newValue.length;
          ta.setSelectionRange(len, len);
          ta.scrollTop = ta.scrollHeight;
        });
      },
    }),
    [],
  );

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasValue = value.trim().length > 0;

  return (
    <div className="border-t border-white/10 bg-altivum-navy/50 backdrop-blur-xs p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            aria-label="Type a message"
            data-autofocus
            disabled={disabled}
            rows={1}
            maxLength={4000}
            className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-altivum-silver/50 focus:outline-hidden focus:border-altivum-gold transition-colors duration-200 resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
            style={{
              minHeight: '48px',
              maxHeight: '200px',
            }}
          />
          <button
            type="submit"
            disabled={!hasValue || disabled}
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
              hasValue && !disabled ? 'text-altivum-gold hover:text-white' : 'text-altivum-silver/50 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Icon name="send" className="text-xl" />
          </button>
        </div>
        {value.length > 0 && (
          <div className="mt-1 text-right pr-1">
            <span
              className={`text-xs tabular-nums transition-colors duration-200 ${
                value.length > 3600 ? 'text-altivum-gold' : 'text-altivum-silver/70'
              }`}
            >
              {value.length}/4,000
            </span>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInput;

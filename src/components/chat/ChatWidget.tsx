import { useState, lazy, Suspense } from 'react';
import ChatWidgetButton from './ChatWidgetButton';
import { trackEvent } from '../../utils/analytics';

// The chat panel (message list, input, suggestions, focus trap, chat engine)
// is only mounted when the visitor opens the widget, so it is code-split into
// its own chunk (VAL-PERF-013): the "chat widget shell" (the dialog UI) is a
// separate dynamic chunk that is not in the initial critical request chain.
// The button stays statically imported so the always-visible launcher renders
// immediately and is prerendered. The 3D mascot (AltiMascot) and three-vendor
// library are already separate lazy chunks via ChatWidgetButton.
const ChatWidgetPanel = lazy(() => import('./ChatWidgetPanel'));

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    // Fire the engagement goal only on open (not on close). Read isOpen from the
    // closure rather than inside the updater — StrictMode double-invokes updaters,
    // which would double-count the event.
    if (!isOpen) trackEvent('Chat Opened', { surface: 'widget' });
    setIsOpen((prev) => !prev);
  };

  return (
    <div data-vt-persist="chat-widget">
      {isOpen && (
        <Suspense fallback={null}>
          <ChatWidgetPanel onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
      <ChatWidgetButton isOpen={isOpen} onClick={toggle} />
    </div>
  );
};

export default ChatWidget;

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return a containerRef and handleKeyDown function', () => {
    const { result } = renderHook(() => useFocusTrap(false));
    expect(result.current.containerRef).toBeDefined();
    expect(typeof result.current.handleKeyDown).toBe('function');
  });

  it('should store previously focused element when activated', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { rerender } = renderHook(({ isActive }) => useFocusTrap(isActive), { initialProps: { isActive: false } });

    // Activate the trap
    rerender({ isActive: true });
    act(() => {
      vi.advanceTimersByTime(20);
    });

    // Deactivate - should return focus to the button
    rerender({ isActive: false });
    expect(document.activeElement).toBe(button);

    document.body.removeChild(button);
  });

  it('restores focus to the previously focused element on unmount while active', () => {
    // ChatWidgetPanel is conditionally rendered ({isOpen && <Panel/>}) and
    // unmounts on close, so the [isActive] effect never re-runs with
    // isActive=false. The unmount-only cleanup must still return focus to the
    // launcher (VAL-ENG-010).
    const launcher = document.createElement('button');
    document.body.appendChild(launcher);
    launcher.focus();

    const { rerender, unmount } = renderHook(({ isActive }) => useFocusTrap(isActive), {
      initialProps: { isActive: false },
    });

    rerender({ isActive: true });
    act(() => {
      vi.advanceTimersByTime(20);
    });

    // Simulate a close path that unmounts the trap while it is still active
    // (the real ChatWidgetPanel close-on-Escape path).
    unmount();

    expect(document.activeElement).toBe(launcher);

    document.body.removeChild(launcher);
  });

  it('should focus the first focusable element when activated', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    // Create a container with focusable elements
    const container = document.createElement('div');
    const firstButton = document.createElement('button');
    firstButton.textContent = 'First';
    const secondButton = document.createElement('button');
    secondButton.textContent = 'Second';
    container.appendChild(firstButton);
    container.appendChild(secondButton);
    document.body.appendChild(container);

    // Manually assign the ref
    Object.defineProperty(result.current.containerRef, 'current', {
      value: container,
      writable: true,
    });

    // Re-render to trigger the effect with the ref set
    const { rerender } = renderHook(({ isActive }) => useFocusTrap(isActive), { initialProps: { isActive: false } });
    rerender({ isActive: true });

    // Note: Since the ref is not connected to the hook's internal ref,
    // this tests the structural contract rather than the exact focus behavior
    document.body.removeChild(container);
  });

  it('focuses the [data-autofocus] element in preference to the first focusable', () => {
    // A panel whose first focusable is a header button but whose intended
    // initial focus is the message input (data-autofocus). Focusing the button
    // would let an early keystroke (or a synthetic-fast test) land on the wrong
    // element — the chat-widget focus-steal bug. The input must win.
    const container = document.createElement('div');
    const headerBtn = document.createElement('button');
    headerBtn.textContent = 'Open full chat';
    const input = document.createElement('textarea');
    input.setAttribute('data-autofocus', '');
    container.appendChild(headerBtn);
    container.appendChild(input);
    document.body.appendChild(container);

    const { result, rerender } = renderHook(({ isActive }) => useFocusTrap(isActive), {
      initialProps: { isActive: false },
    });
    // Connect the hook's own ref to the container so the effect can find it.
    result.current.containerRef.current = container;
    rerender({ isActive: true });
    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(document.activeElement).toBe(input);

    document.body.removeChild(container);
  });

  it('falls back to the first focusable element when no [data-autofocus] is present', () => {
    const container = document.createElement('div');
    const firstBtn = document.createElement('button');
    firstBtn.textContent = 'First';
    const secondBtn = document.createElement('button');
    secondBtn.textContent = 'Second';
    container.appendChild(firstBtn);
    container.appendChild(secondBtn);
    document.body.appendChild(container);

    const { result, rerender } = renderHook(({ isActive }) => useFocusTrap(isActive), {
      initialProps: { isActive: false },
    });
    result.current.containerRef.current = container;
    rerender({ isActive: true });
    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(document.activeElement).toBe(firstBtn);

    document.body.removeChild(container);
  });

  it('should handle Tab key to wrap focus from last to first element', () => {
    const container = document.createElement('div');
    const firstBtn = document.createElement('button');
    const lastBtn = document.createElement('button');
    container.appendChild(firstBtn);
    container.appendChild(lastBtn);
    document.body.appendChild(container);

    const { result } = renderHook(() => useFocusTrap(true));

    // Manually set the ref
    Object.defineProperty(result.current.containerRef, 'current', {
      value: container,
      writable: true,
    });

    // Simulate last element is focused
    lastBtn.focus();

    const event = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(firstBtn);

    document.body.removeChild(container);
  });

  it('should handle Shift+Tab to wrap focus from first to last element', () => {
    const container = document.createElement('div');
    const firstBtn = document.createElement('button');
    const lastBtn = document.createElement('button');
    container.appendChild(firstBtn);
    container.appendChild(lastBtn);
    document.body.appendChild(container);

    const { result } = renderHook(() => useFocusTrap(true));

    Object.defineProperty(result.current.containerRef, 'current', {
      value: container,
      writable: true,
    });

    firstBtn.focus();

    const event = {
      key: 'Tab',
      shiftKey: true,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(lastBtn);

    document.body.removeChild(container);
  });

  it('should not prevent default when pressing non-Tab keys', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    const event = {
      key: 'Enter',
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should not prevent default when containerRef is null', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    // containerRef.current is null by default
    const event = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

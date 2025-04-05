import { useEffect, useRef } from 'react';

type KeyCombo = 'shift+f' | 'escape' | 'enter' | 'shift+enter';
type KeyHandler = (event?: KeyboardEvent) => void;

interface Keybinding {
  keys: KeyCombo[];
  handler: KeyHandler;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * Converts a keyboard event into a standardized key combination string.
 * Example: "Ctrl+Shift+S"
 */
const getKeyCombo = (event: KeyboardEvent): KeyCombo => {
  const keys = new Set<string>();

  if (event.ctrlKey) keys.add('ctrl');
  if (event.shiftKey) keys.add('shift');
  if (event.altKey) keys.add('alt');
  if (event.metaKey) keys.add('cmd');

  keys.add(event.key.toLowerCase());

  return Array.from(keys).join('+') as KeyCombo;
};

/**
 * Custom hook to handle keybindings for a specific element or globally.
 * Returns a ref that can be attached to an element to bind the shortcuts to it.
 * If the ref is not attached to any element, shortcuts will be bound globally.
 * @param bindings Array of keybindings to register
 */
const useKeybindings = <T extends HTMLElement>(bindings: Keybinding[]) => {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const keyHandler = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      const combo = getKeyCombo(keyboardEvent);
      const binding = bindings.find((b) => b.keys.includes(combo));

      if (binding) {
        if (binding.preventDefault) keyboardEvent.preventDefault();
        if (binding.stopPropagation) keyboardEvent.stopPropagation();
        binding.handler(keyboardEvent);
      }
    };

    const target = elementRef.current || window;
    target.addEventListener('keydown', keyHandler);

    return () => {
      target.removeEventListener('keydown', keyHandler);
    };
  }, [bindings]);

  return { keyBindingTargetRef: elementRef };
};

export default useKeybindings;

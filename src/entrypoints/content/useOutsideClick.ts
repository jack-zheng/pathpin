import { useEffect, RefObject } from 'react';

export function useOutsideClick(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        onClose();
      }
    }
    const shadowRoot = ref.current?.getRootNode() as ShadowRoot | Document;
    document.addEventListener('mousedown', handleClick);
    shadowRoot.addEventListener('mousedown', handleClick as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      shadowRoot.removeEventListener('mousedown', handleClick as EventListener);
    };
  }, [ref, onClose]);
}

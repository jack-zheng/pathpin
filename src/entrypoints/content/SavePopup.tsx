import { useState, useRef, useEffect } from 'react';

interface SavePopupProps {
  defaultTitle: string;
  widgetPos: { bottom: number; right: number };
  onConfirm: (title: string) => void;
  onCancel: () => void;
}

export default function SavePopup({ defaultTitle, widgetPos, onConfirm, onCancel }: SavePopupProps) {
  const [title, setTitle] = useState(defaultTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm(title);
    }
    function handleClick(e: MouseEvent) {
      const rect = popupRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onCancel();
    }
    const shadowRoot = popupRef.current?.getRootNode() as ShadowRoot | Document;
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    shadowRoot.addEventListener('mousedown', handleClick as EventListener);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
      shadowRoot.removeEventListener('mousedown', handleClick as EventListener);
    };
  }, [title, onConfirm, onCancel]);

  const WIDGET_HEIGHT = 58;
  const POPUP_MARGIN = 8;
  const POPUP_HEIGHT = 90;
  const spaceAbove = window.innerHeight - widgetPos.bottom - WIDGET_HEIGHT;
  const openUpward = spaceAbove >= POPUP_HEIGHT;
  const posStyle: React.CSSProperties = openUpward
    ? { bottom: widgetPos.bottom + WIDGET_HEIGHT + POPUP_MARGIN, right: widgetPos.right }
    : { top: window.innerHeight - widgetPos.bottom + POPUP_MARGIN, right: widgetPos.right };

  return (
    <div className="pathpin-popup" ref={popupRef} style={posStyle}>
      <input
        ref={inputRef}
        className="pathpin-popup-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Bookmark title"
      />
      <div className="pathpin-popup-actions">
        <button className="pathpin-popup-btn confirm" onClick={() => onConfirm(title)}>Save</button>
        <button className="pathpin-popup-btn cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onConfirm(title);
    if (e.key === 'Escape') onCancel();
  }

  const WIDGET_HEIGHT = 48;
  const POPUP_MARGIN = 8;
  const POPUP_HEIGHT = 90;
  const spaceAbove = window.innerHeight - widgetPos.bottom - WIDGET_HEIGHT;
  const openUpward = spaceAbove >= POPUP_HEIGHT;
  const posStyle: React.CSSProperties = openUpward
    ? { bottom: widgetPos.bottom + WIDGET_HEIGHT + POPUP_MARGIN, right: widgetPos.right }
    : { top: window.innerHeight - widgetPos.bottom + POPUP_MARGIN, right: widgetPos.right };

  return (
    <div className="pathpin-popup" style={posStyle}>
      <input
        ref={inputRef}
        className="pathpin-popup-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Bookmark title"
      />
      <div className="pathpin-popup-actions">
        <button className="pathpin-popup-btn confirm" onClick={() => onConfirm(title)}>Save</button>
        <button className="pathpin-popup-btn cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

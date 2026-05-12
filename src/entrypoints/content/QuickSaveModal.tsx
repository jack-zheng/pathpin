import { useState, useRef, useEffect } from 'react';

interface QuickSaveModalProps {
  defaultTitle: string;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}

export default function QuickSaveModal({ defaultTitle, onConfirm, onCancel }: QuickSaveModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm(title);
    }
    function handleClick(e: MouseEvent) {
      const rect = modalRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onCancel();
    }
    const shadowRoot = modalRef.current?.getRootNode() as ShadowRoot | Document;
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    shadowRoot.addEventListener('mousedown', handleClick as EventListener);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
      shadowRoot.removeEventListener('mousedown', handleClick as EventListener);
    };
  }, [title, onConfirm, onCancel]);

  return (
    <div className="pathpin-quick-save" ref={modalRef}>
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

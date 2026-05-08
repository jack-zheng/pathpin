import { useState, useRef, useEffect } from 'react';

interface SavePopupProps {
  defaultTitle: string;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}

export default function SavePopup({ defaultTitle, onConfirm, onCancel }: SavePopupProps) {
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

  return (
    <div className="pathpin-popup">
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

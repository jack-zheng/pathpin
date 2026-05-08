import { useEffect, useRef, useState } from 'react';
import './widget.css';

interface WidgetProps {
  onStarClick: () => void;
  onBookmarkClick: () => void;
  isStarred: boolean;
}

const STORAGE_KEY = 'pathpin_widget_position';
const DEFAULT_POS = { bottom: 24, right: 24 };

export default function Widget({ onStarClick, onBookmarkClick, isStarred }: WidgetProps) {
  const [pos, setPos] = useState(DEFAULT_POS);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startPos = useRef(DEFAULT_POS);
  const ref = useRef<HTMLDivElement>(null);

  // Load saved position
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then(r => {
      if (r[STORAGE_KEY]) setPos(r[STORAGE_KEY]);
    });
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    moved.current = false;
    startPointer.current = { x: e.clientX, y: e.clientY };
    startPos.current = pos;
    ref.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - startPointer.current.x;
    const dy = e.clientY - startPointer.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
    const newRight = Math.max(0, Math.min(window.innerWidth - (ref.current?.offsetWidth ?? 0), startPos.current.right - dx));
    const newBottom = Math.max(0, Math.min(window.innerHeight - (ref.current?.offsetHeight ?? 0), startPos.current.bottom - dy));
    setPos({ right: newRight, bottom: newBottom });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging.current) return;
    dragging.current = false;
    if (moved.current) {
      chrome.storage.local.set({ [STORAGE_KEY]: pos });
    }
    e.preventDefault();
  }

  return (
    <div
      ref={ref}
      className="pathpin-widget"
      style={{ bottom: pos.bottom, right: pos.right, cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <button
        className={`pathpin-btn pathpin-star ${isStarred ? 'starred' : ''}`}
        onClick={e => { if (moved.current) { e.stopPropagation(); return; } onStarClick(); }}
        title={isStarred ? 'Remove bookmark' : 'Save path'}
      >
        {isStarred ? '★' : '☆'}
      </button>
      <button
        className="pathpin-btn pathpin-bookmark"
        onClick={e => { if (moved.current) { e.stopPropagation(); return; } onBookmarkClick(); }}
        title="Open bookmarks"
      >
        🔖
      </button>
    </div>
  );
}

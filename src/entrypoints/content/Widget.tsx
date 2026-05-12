import { useRef } from 'react';
import './widget.css';
import { WIDGET_STORAGE_KEY } from '../../shared/constants';
import starMarkedUrl from '../../assets/star_marked.svg?url';
import starUnmarkedUrl from '../../assets/star_unmarked.svg?url';
import bookmarkUrl from '../../assets/bookmark.svg?url';

interface WidgetProps {
  onStarClick: () => void;
  onBookmarkClick: () => void;
  isStarred: boolean;
  pos: { bottom: number; right: number };
  setPos: (pos: { bottom: number; right: number }) => void;
}

const STORAGE_KEY = WIDGET_STORAGE_KEY;

export default function Widget({ onStarClick, onBookmarkClick, isStarred, pos, setPos }: WidgetProps) {
  const dragging = useRef(false);
  const moved = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startPos = useRef(pos);
  const ref = useRef<HTMLDivElement>(null);

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
    setTimeout(() => { moved.current = false; }, 0);
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
        <img src={isStarred ? starMarkedUrl : starUnmarkedUrl} alt="star" />
      </button>
      <button
        className="pathpin-btn pathpin-bookmark"
        onClick={e => { if (moved.current) { e.stopPropagation(); return; } onBookmarkClick(); }}
        title="Open bookmarks"
      >
        <img src={bookmarkUrl} alt="bookmark" />
      </button>
    </div>
  );
}

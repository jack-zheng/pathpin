import { useState, useRef, useEffect } from 'react';
import { getBookmarks, incrementUsage } from '../../shared/storage';
import type { Bookmark } from '../../shared/types';

interface QuickStarModalProps {
  mode: 'star';
  defaultTitle: string;
  onConfirm: (title: string) => void;
  onClose: () => void;
}

interface QuickSearchModalProps {
  mode: 'search';
  onClose: () => void;
}

type QuickModalProps = QuickStarModalProps | QuickSearchModalProps;

export default function QuickModal(props: QuickModalProps) {
  const { mode, onClose } = props;
  const [title, setTitle] = useState(mode === 'star' ? props.defaultTitle : '');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'search') getBookmarks().then(setBookmarks);
  }, [mode]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (mode === 'star') {
      input.setSelectionRange(input.value.length, input.value.length);
      input.scrollLeft = 0;
    }
  }, [mode]);

  const filtered = bookmarks
    .filter(b => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return b.title.toLowerCase().includes(q) || b.path.toLowerCase().includes(q);
    })
    .sort((a, b) => b.usageCount - a.usageCount);

  async function handleNavigate(bookmark: Bookmark) {
    await incrementUsage(bookmark.id);
    window.location.href = window.location.origin + bookmark.path;
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (mode === 'star' && e.key === 'Enter') {
        (props as QuickStarModalProps).onConfirm(title);
        return;
      }
    }
    function handleClick(e: MouseEvent) {
      const rect = modalRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose();
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
  }, [mode, title, onClose, props]);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[selectedIndex]) { e.preventDefault(); handleNavigate(filtered[selectedIndex]); }
  }

  return (
    <div className="pathpin-quick-modal" ref={modalRef}>
      {mode === 'star' ? (
        <input
          ref={inputRef}
          className="pathpin-panel-search"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Bookmark title — Enter to save"
        />
      ) : (
        <>
          <div className="pathpin-panel-header">
            <input
              ref={inputRef}
              className="pathpin-panel-search"
              placeholder="Search bookmarks..."
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleSearchKeyDown}
            />
            <span className="pathpin-panel-count">{filtered.length}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="pathpin-panel-empty">No bookmarks yet</div>
          ) : (
            <ul className="pathpin-panel-list">
              {filtered.map((bookmark, idx) => (
                <li key={bookmark.id} className={`pathpin-panel-item${idx === selectedIndex ? ' selected' : ''}`}>
                  <button className="pathpin-panel-link" onClick={() => handleNavigate(bookmark)}>
                    <span className="pathpin-panel-title">{bookmark.title}</span>
                    <span className="pathpin-panel-path">{bookmark.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { getBookmarks, deleteBookmark, updateBookmark, incrementUsage } from '../../shared/storage';
import type { Bookmark } from '../../shared/types';

interface PanelProps {
  onClose: () => void;
  onDeleteBookmark?: (id: string) => void;
}

export default function Panel({ onClose, onDeleteBookmark }: PanelProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getBookmarks().then(setBookmarks);
  }, []);

  // Close on outside click — must listen on shadow root's ownerDocument
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const shadowRoot = panelRef.current?.getRootNode() as ShadowRoot | null;
      const target = e.composedPath()[0] as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
      void shadowRoot;
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const filtered = bookmarks
    .filter(b => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return b.title.toLowerCase().includes(q) || b.path.toLowerCase().includes(q);
    })
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, query ? undefined : 5);

  async function handleNavigate(bookmark: Bookmark) {
    await incrementUsage(bookmark.id);
    window.location.href = window.location.origin + bookmark.path;
  }

  async function handleDelete(id: string) {
    await deleteBookmark(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
    onDeleteBookmark?.(id);
  }

  function startEdit(bookmark: Bookmark) {
    setEditingId(bookmark.id);
    setEditingTitle(bookmark.title);
  }

  async function confirmEdit(id: string) {
    await updateBookmark(id, { title: editingTitle });
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, title: editingTitle } : b));
    setEditingId(null);
  }

  return (
    <div className="pathpin-panel" ref={panelRef}>
      <input
        className="pathpin-panel-search"
        placeholder="Search bookmarks..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
      {filtered.length === 0 ? (
        <div className="pathpin-panel-empty">No bookmarks yet</div>
      ) : (
        <ul className="pathpin-panel-list">
          {filtered.map(bookmark => (
            <li key={bookmark.id} className="pathpin-panel-item">
              {editingId === bookmark.id ? (
                <input
                  className="pathpin-panel-edit-input"
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmEdit(bookmark.id); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                />
              ) : (
                <button className="pathpin-panel-link" onClick={() => handleNavigate(bookmark)}>
                  <span className="pathpin-panel-title">{bookmark.title}</span>
                  <span className="pathpin-panel-path">{bookmark.path}</span>
                </button>
              )}
              <div className="pathpin-panel-actions">
                {editingId === bookmark.id ? (
                  <button className="pathpin-panel-action" onClick={() => confirmEdit(bookmark.id)}>✓</button>
                ) : (
                  <button className="pathpin-panel-action" onClick={() => startEdit(bookmark)}>✎</button>
                )}
                <button className="pathpin-panel-action delete" onClick={() => handleDelete(bookmark.id)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { getBookmarks, deleteBookmark, updateBookmark, incrementUsage } from '../../shared/storage';
import type { Bookmark } from '../../shared/types';

interface PanelProps {
  onClose: () => void;
  onDeleteBookmark?: (id: string) => void;
  widgetPos: { bottom: number; right: number };
}

export default function Panel({ onClose, onDeleteBookmark, widgetPos }: PanelProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getBookmarks().then(setBookmarks);
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const shadowRoot = panelRef.current?.getRootNode() as ShadowRoot | null;
      const target = e.composedPath()[0] as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
      void shadowRoot;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, editingId]);

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

  const WIDGET_HEIGHT = 48;
  const POPUP_MARGIN = 8;
  const PANEL_HEIGHT = 340;
  const spaceAbove = window.innerHeight - widgetPos.bottom - WIDGET_HEIGHT;
  const openUpward = spaceAbove >= PANEL_HEIGHT;
  const posStyle: React.CSSProperties = openUpward
    ? { bottom: widgetPos.bottom + WIDGET_HEIGHT + POPUP_MARGIN, right: widgetPos.right }
    : { top: window.innerHeight - widgetPos.bottom + POPUP_MARGIN, right: widgetPos.right };

  return (
    <div className="pathpin-panel" ref={panelRef} style={posStyle}>
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
                  onKeyDown={e => { if (e.key === 'Enter') confirmEdit(bookmark.id); }}
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

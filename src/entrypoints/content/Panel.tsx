import React, { useState, useEffect, useRef } from 'react';
import { getBookmarks, deleteBookmark, updateBookmark, incrementUsage } from '../../shared/storage';
import type { Bookmark } from '../../shared/types';
import { parseTokens, matchesTokens, highlight } from '../../shared/search';

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getBookmarks().then(setBookmarks);
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        onClose();
      }
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
    const shadowRoot = panelRef.current?.getRootNode() as ShadowRoot | Document;
    shadowRoot.addEventListener('mousedown', handleClick as EventListener);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      shadowRoot.removeEventListener('mousedown', handleClick as EventListener);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, editingId]);

  const tokens = parseTokens(query);
  const filtered = bookmarks
    .filter(b => {
      if (!tokens.length) return true;
      return matchesTokens(b.title, tokens) || matchesTokens(b.path, tokens);
    })
    .sort((a, b) => b.usageCount - a.usageCount);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleNavigate(filtered[selectedIndex]);
    }
  }

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

  function Highlighted({ text }: { text: string }) {
    const parts = highlight(text, tokens);
    return <>{parts.map((p, i) => typeof p === 'string' ? <span key={i}>{p}</span> : <strong key={i}>{p.bold}</strong>)}</>;
  }

  const WIDGET_HEIGHT = 58;
  const POPUP_MARGIN = 8;
  const PANEL_HEIGHT = 400;
  const spaceAbove = window.innerHeight - widgetPos.bottom - WIDGET_HEIGHT;
  const openUpward = spaceAbove >= PANEL_HEIGHT;
  const posStyle: React.CSSProperties = openUpward
    ? { bottom: widgetPos.bottom + WIDGET_HEIGHT + POPUP_MARGIN, right: widgetPos.right }
    : { top: window.innerHeight - widgetPos.bottom + POPUP_MARGIN, right: widgetPos.right };

  return (
    <div className="pathpin-panel" ref={panelRef} style={posStyle}>
      <div className="pathpin-panel-header">
        <input
          className="pathpin-panel-search"
          placeholder="Search bookmarks..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
          onKeyDown={handleSearchKeyDown}
          autoFocus
        />
        <span className="pathpin-panel-count">{filtered.length}</span>
      </div>
      {filtered.length === 0 ? (
        <div className="pathpin-panel-empty">No bookmarks yet</div>
      ) : (
        <ul className="pathpin-panel-list">
          {filtered.map((bookmark, idx) => (
            <li key={bookmark.id} className={`pathpin-panel-item${idx === selectedIndex ? ' selected' : ''}`}>
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
                  <span className="pathpin-panel-title"><Highlighted text={bookmark.title} /></span>
                  <span className="pathpin-panel-path"><Highlighted text={bookmark.path} /></span>
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

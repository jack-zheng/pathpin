import ReactDOM from 'react-dom/client';
import { useState, useEffect, useRef } from 'react';
import { getRules, getBookmarks, addBookmark, deleteBookmark, getWidgetEnabled, setWidgetEnabled } from '../../shared/storage';
import { matchesRules } from '../../shared/rules';
import { WIDGET_STORAGE_KEY } from '../../shared/constants';
import Widget from './Widget';
import SavePopup from './SavePopup';
import Panel from './Panel';
import QuickModal from './QuickModal';

const DEFAULT_POS = { bottom: 24, right: 24 };

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'pathpin-widget',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(<App />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
  },
});

function App() {
  const [visible, setVisible] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showQuickSave, setShowQuickSave] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);  const [widgetPos, setWidgetPos] = useState(DEFAULT_POS);
  const panelJustClosed = useRef(false);

  useEffect(() => {
    chrome.storage.local.get(WIDGET_STORAGE_KEY).then(r => {
      if (r[WIDGET_STORAGE_KEY]) setWidgetPos(r[WIDGET_STORAGE_KEY]);
    });
  }, []);

  useEffect(() => {
    async function check() {
      const [rules, bookmarks, enabled] = await Promise.all([getRules(), getBookmarks(), getWidgetEnabled()]);
      const matched = matchesRules(rules, window.location.href, document.title);
      const existing = bookmarks.find(b => b.path === window.location.pathname);
      setVisible(matched);
      setWidgetVisible(matched && enabled);
      setIsStarred(!!existing);
      setSavedId(existing?.id ?? null);
    }
    check();
  }, []);

  async function handleStarClick() {
    if (isStarred && savedId) {
      await deleteBookmark(savedId);
      setIsStarred(false);
      setSavedId(null);
    } else {
      setShowPopup(true);
    }
  }

  async function handleSaveConfirm(title: string) {
    const bookmark = await addBookmark({ title, path: window.location.pathname });
    setIsStarred(true);
    setSavedId(bookmark.id);
    setShowPopup(false);
    setShowQuickSave(false);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        if (isStarred && savedId) {
          deleteBookmark(savedId).then(() => { setIsStarred(false); setSavedId(null); });
        } else {
          setShowQuickSave(true);
        }
      }
      if (e.altKey && e.code === 'KeyB') {
        e.preventDefault();
        setShowQuickSearch(true);
      }
      if (e.altKey && e.code === 'KeyH') {
        e.preventDefault();
        setWidgetVisible(prev => {
          const next = !prev;
          setWidgetEnabled(next);
          return next;
        });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isStarred, savedId]);

  if (!visible) return null;

  return (
    <>
      {showQuickSave && (
        <QuickModal
          mode="star"
          defaultTitle={document.title}
          onConfirm={handleSaveConfirm}
          onClose={() => setShowQuickSave(false)}
        />
      )}
      {showQuickSearch && (
        <QuickModal mode="search" onClose={() => setShowQuickSearch(false)} />
      )}
      {showPopup && (
        <SavePopup
          defaultTitle={document.title}
          widgetPos={widgetPos}
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowPopup(false)}
        />
      )}
      {showPanel && <Panel widgetPos={widgetPos} onClose={() => { setShowPanel(false); panelJustClosed.current = true; }} onDeleteBookmark={id => { if (id === savedId) { setIsStarred(false); setSavedId(null); } }} />}
      {widgetVisible && (
        <Widget
          isStarred={isStarred}
          pos={widgetPos}
          setPos={setWidgetPos}
          onStarClick={handleStarClick}
          onBookmarkClick={() => { if (panelJustClosed.current) { panelJustClosed.current = false; return; } setShowPanel(true); }}
        />
      )}
    </>
  );
}

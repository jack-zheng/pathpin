import ReactDOM from 'react-dom/client';
import { useState, useEffect, useRef } from 'react';
import { getRules, getBookmarks, addBookmark, deleteBookmark } from '../../shared/storage';
import { matchesRules } from '../../shared/rules';
import Widget from './Widget';
import SavePopup from './SavePopup';
import Panel from './Panel';
import QuickSaveModal from './QuickSaveModal';

const STORAGE_KEY = 'pathpin_widget_position';
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
  const [isStarred, setIsStarred] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [showQuickSave, setShowQuickSave] = useState(false);
  const [widgetPos, setWidgetPos] = useState(DEFAULT_POS);
  const panelJustClosed = useRef(false);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then(r => {
      if (r[STORAGE_KEY]) setWidgetPos(r[STORAGE_KEY]);
    });
  }, []);

  useEffect(() => {
    async function check() {
      const [rules, bookmarks] = await Promise.all([getRules(), getBookmarks()]);
      const matched = matchesRules(rules, window.location.href, document.title);
      const existing = bookmarks.find(b => b.path === window.location.pathname);
      setVisible(matched);
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
      if (e.altKey && (e.key === 's' || e.key === 'ß')) {
        e.preventDefault();
        if (isStarred && savedId) {
          deleteBookmark(savedId).then(() => { setIsStarred(false); setSavedId(null); });
        } else {
          setShowQuickSave(true);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isStarred, savedId]);

  if (!visible) return null;

  return (
    <>
      {showQuickSave && (
        <QuickSaveModal
          defaultTitle={document.title}
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowQuickSave(false)}
        />
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
      <Widget
        isStarred={isStarred}
        pos={widgetPos}
        setPos={setWidgetPos}
        onStarClick={handleStarClick}
        onBookmarkClick={() => { if (panelJustClosed.current) { panelJustClosed.current = false; return; } setShowPanel(true); }}
      />
    </>
  );
}

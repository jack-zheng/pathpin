import ReactDOM from 'react-dom/client';
import { useState, useEffect } from 'react';
import { getRules, getBookmarks, addBookmark, deleteBookmark } from '../../shared/storage';
import { matchesRules } from '../../shared/rules';
import Widget from './Widget';
import SavePopup from './SavePopup';
import Panel from './Panel';

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

  useEffect(() => {
    async function check() {
      const [rules, bookmarks] = await Promise.all([getRules(), getBookmarks()]);
      const matched = matchesRules(rules, window.location.href, document.title);
      const existing = bookmarks.find(b => b.path === window.location.pathname);
      setVisible(matched);
      setIsStarred(!!existing);
      setSavedId(existing?.id ?? null);
      setShowPopup(false);
      setShowPanel(false);
    }

    check();

    window.addEventListener('popstate', check);
    window.addEventListener('hashchange', check);

    // Patch history.pushState / replaceState for SPA navigation
    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);
    history.pushState = (...args) => { originalPush(...args); check(); };
    history.replaceState = (...args) => { originalReplace(...args); check(); };

    return () => {
      window.removeEventListener('popstate', check);
      window.removeEventListener('hashchange', check);
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
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
  }

  if (!visible) return null;

  return (
    <>
      {showPopup && (
        <SavePopup
          defaultTitle={document.title}
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowPopup(false)}
        />
      )}
      {showPanel && <Panel onClose={() => setShowPanel(false)} onDeleteBookmark={id => { if (id === savedId) { setIsStarred(false); setSavedId(null); } }} />}
      <Widget
        isStarred={isStarred}
        onStarClick={handleStarClick}
        onBookmarkClick={() => setShowPanel(prev => !prev)}
      />
    </>
  );
}

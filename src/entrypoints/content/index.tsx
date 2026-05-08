import ReactDOM from 'react-dom/client';
import { useState, useEffect } from 'react';
import { getRules, getBookmarks, addBookmark, deleteBookmark } from '../../shared/storage';
import { matchesRules } from '../../shared/rules';
import Widget from './Widget';
import SavePopup from './SavePopup';

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
      <Widget
        isStarred={isStarred}
        onStarClick={handleStarClick}
        onBookmarkClick={() => {/* T6 */}}
      />
    </>
  );
}

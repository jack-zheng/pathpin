import ReactDOM from 'react-dom/client';
import { useState, useEffect } from 'react';
import { getRules, getBookmarks } from '../../shared/storage';
import { matchesRules } from '../../shared/rules';
import Widget from './Widget';

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

  useEffect(() => {
    async function check() {
      const [rules, bookmarks] = await Promise.all([getRules(), getBookmarks()]);
      const matched = matchesRules(rules, window.location.href, document.title);
      const starred = bookmarks.some(b => b.path === window.location.pathname);
      setVisible(matched);
      setIsStarred(starred);
    }
    check();
  }, []);

  if (!visible) return null;

  return (
    <Widget
      isStarred={isStarred}
      onStarClick={() => {/* T5 */}}
      onBookmarkClick={() => {/* T6 */}}
    />
  );
}

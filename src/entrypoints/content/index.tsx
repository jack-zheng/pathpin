import ReactDOM from 'react-dom/client';

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
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2147483647 }}>
      {/* Widget will be implemented in T4 */}
    </div>
  );
}

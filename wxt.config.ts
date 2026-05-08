import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: 'PathPin',
    description: 'Save URL paths for multi-environment bookmarks',
    version: '1.0.0',
    permissions: ['storage'],
    options_ui: {
      page: 'options/index.html',
      open_in_tab: true,
    },
  },
});

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
    icons: {
      16: 'icons/16.png',
      32: 'icons/32.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
    options_ui: {
      page: 'options/index.html',
      open_in_tab: true,
    },
  },
});

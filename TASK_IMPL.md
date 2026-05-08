# PathPin — Task Implementation Notes

记录每个 Task 的具体实现步骤，方便手动复现学习。

---

## T1: Project Scaffold

### 目标
用 WXT 框架搭建 Chrome Extension (MV3) 的项目骨架，跑通构建流程。

### 关键概念
- **WXT**：专为 Chrome 扩展设计的构建工具，类似 Vite，自动处理 manifest 生成、content script 注入、HMR 调试。
- **Manifest V3**：Chrome 扩展的最新规范，用 `service_worker` 替代 background page，内容脚本权限更严格。
- **`srcDir`**：WXT 默认在项目根目录找 `entrypoints/` 文件夹；设置 `srcDir: 'src'` 后，改为在 `src/entrypoints/` 下找。

### 步骤

#### 1. 初始化 npm 项目
```bash
cd pathpin
npm init -y
```

#### 2. 安装依赖
```bash
npm i -D wxt @wxt-dev/module-react
npm i react react-dom
```

- `wxt`：构建框架，内部已捆绑 TypeScript 和 `@types/*`，无需额外安装
- `@wxt-dev/module-react`：WXT 的 React 插件，自动配置 JSX transform
- `react` / `react-dom`：运行时依赖，会被打包进扩展，所以放 `dependencies` 而非 `devDependencies`

#### 3. 修改 package.json — 添加构建脚本
```json
{
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "postinstall": "wxt prepare"
  }
}
```

- `wxt`（即 `dev`）：启动开发模式，监听文件变化，支持 HMR
- `wxt build`：生产构建，输出到 `.output/chrome-mv3/`
- `wxt prepare`：生成 `.wxt/tsconfig.json` 和类型声明（首次安装后或 config 变更后需运行）

#### 4. 创建 wxt.config.ts
```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',                      // 把源码放在 src/ 下
  manifest: {
    name: 'PathPin',
    description: 'Save URL paths for multi-environment bookmarks',
    version: '1.0.0',
    permissions: ['storage'],         // 使用 chrome.storage.local 必须声明
    options_ui: {
      page: 'options/index.html',
      open_in_tab: true,
    },
  },
});
```

**要点**：
- `permissions: ['storage']`：声明后才能调用 `chrome.storage.local`
- `options_ui.page`：路径相对于 manifest 输出目录，WXT 会自动把 `src/entrypoints/options/` 构建为 `options.html`

#### 5. 创建目录结构
```
src/
├── entrypoints/
│   ├── content/          ← content script（注入到网页）
│   └── options/          ← 扩展设置页面
└── shared/               ← 业务逻辑，content script 和 options 共享
```

WXT 约定：`entrypoints/` 下的每个文件/目录会被识别为一个入口点（content script、popup、options page 等），文件名决定入口类型。

#### 6. 创建 src/shared/types.ts — 数据类型定义
```ts
export interface Bookmark {
  id: string;
  title: string;
  path: string;           // 只存 pathname，如 /home
  usageCount: number;
  createdAt: string;      // ISO 8601
}

export interface Rule {
  id: string;
  type: 'url_contains' | 'title_contains';
  value: string;
}

export interface StorageData {
  bookmarks: Bookmark[];
  rules: Rule[];
}
```

#### 7. 创建 src/shared/storage.ts — Chrome Storage CRUD
使用 `chrome.storage.local` 的 Promise API（Chrome 107+ 原生支持 Promise）：

```ts
// 读取
const result = await chrome.storage.local.get('bookmarks');
const bookmarks = result.bookmarks ?? [];

// 写入
await chrome.storage.local.set({ bookmarks });
```

**生成 UUID**：直接用浏览器内置的 `crypto.randomUUID()`，不需要额外依赖。

#### 8. 创建 src/shared/rules.ts — 规则匹配
```ts
export function matchesRules(rules: Rule[], url: string, title: string): boolean {
  if (rules.length === 0) return false;
  return rules.some(rule => {
    if (rule.type === 'url_contains') return url.includes(rule.value);
    if (rule.type === 'title_contains') return title.includes(rule.value);
    return false;
  });
}
```

OR 逻辑：`Array.some()` 遇到第一个 `true` 就停止。

#### 9. 创建 src/entrypoints/content/index.tsx — Content Script 入口
WXT 提供了 `defineContentScript` 和 `createShadowRootUi` 两个全局 API（通过 auto-import，无需 import 语句）：

```tsx
export default defineContentScript({
  matches: ['<all_urls>'],        // 匹配所有页面（实际显示逻辑在 App 里控制）
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
```

**Shadow DOM 的作用**：把 extension 的 DOM 和样式与宿主页面完全隔离，避免 CSS 冲突和 JS 污染。

#### 10. 创建 src/entrypoints/options/ — 选项页面
WXT 约定：`options/index.html` + `options/main.tsx` 组合会被识别为 Options Page 入口。

`index.html` 是普通 HTML 模板，`<script type="module" src="./main.tsx">` 引入 React 入口；
`main.tsx` 调用 `ReactDOM.createRoot` 挂载 App 组件，与普通 React SPA 完全相同。

#### 11. 运行 wxt prepare（生成类型）
```bash
npx wxt prepare
```
生成 `.wxt/tsconfig.json`（包含 WXT 全局 API 的类型声明路径），后续 TypeScript 编译和 IDE 类型提示依赖这个文件。

#### 12. 构建验证
```bash
npm run build
# 或
npx wxt build
```

成功后检查 `.output/chrome-mv3/manifest.json`，确认：
- `manifest_version: 3`
- `permissions: ["storage"]`
- `content_scripts` 数组存在
- `options_ui.page` 指向正确路径

#### 13. 在 Chrome 中加载扩展
1. 打开 `chrome://extensions`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目的 `.output/chrome-mv3/` 目录
5. 确认扩展卡片出现且无红色报错

#### 14. 验证 HMR（开发模式）
```bash
npm run dev
```
启动后修改任意源文件（如 `App.tsx`），Chrome 中的扩展会自动刷新，无需手动点击「重新加载」。

### 最终文件清单
| 文件 | 说明 |
|------|------|
| `package.json` | 依赖 + 脚本 |
| `wxt.config.ts` | WXT 配置 + manifest 声明 |
| `src/shared/types.ts` | Bookmark、Rule 数据类型 |
| `src/shared/storage.ts` | chrome.storage.local CRUD |
| `src/shared/rules.ts` | 环境规则匹配逻辑 |
| `src/entrypoints/content/index.tsx` | Content script，Shadow DOM 挂载 React |
| `src/entrypoints/options/index.html` | Options page HTML 模板 |
| `src/entrypoints/options/main.tsx` | Options page React 入口 |
| `src/entrypoints/options/App.tsx` | Options page 根组件（占位） |

---

<!-- T2 及后续任务实现后在此追加 -->

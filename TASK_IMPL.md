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

## T2: Storage Layer

### 目标
实现 `chrome.storage.local` 的完整 CRUD，供 content script 和 options page 共用。

### 关键概念
- **`chrome.storage.local`**：扩展专属的本地存储，比 `localStorage` 容量更大（默认 10MB），且在 content script、options page、service worker 之间共享同一个命名空间。
- **Promise API**：Chrome 107+ 起 `chrome.storage` 原生支持 Promise，可以直接 `await chrome.storage.local.get(...)`，无需回调写法。
- **`crypto.randomUUID()`**：浏览器内置 API，生成 UUID v4，不需要安装 `uuid` 包。

### 实现说明

T2 的所有代码已在 T1 脚手架阶段一并写入 `src/shared/storage.ts`，无需额外修改。

**数据读写模式**：WXT 不提供响应式 storage 封装，所有操作是"读取 → 修改 → 写回"的完整替换：

```ts
// 典型的"先读后写"模式
async function incrementUsage(id: string) {
  const bookmarks = await getBookmarks();          // 读全量
  await saveBookmarks(                             // 写全量
    bookmarks.map(b => b.id === id
      ? { ...b, usageCount: b.usageCount + 1 }
      : b
    )
  );
}
```

**import/export 的 merge 逻辑**：按 `id` 去重，已存在的条目不覆盖：
```ts
const merged = [...existing, ...incoming.filter(x => !existingIds.has(x.id))];
```

### 文件
| 文件 | 变更 |
|------|------|
| `src/shared/types.ts` | 已在 T1 完成，无变更 |
| `src/shared/storage.ts` | 已在 T1 完成，无变更 |

### 测试说明

`storage.ts` 里的函数被打包进 bundle，无法在 console 里直接 import 调用。**T2 没有独立的手动测试方法**——它的正确性会在后续 UI task 里自然体现：T5 收藏书签、T6 点击跳转，背后调用的就是这些函数，行为正确即说明 storage 层没问题。

如果想提前验证 `chrome.storage` 本身是否可用，可以在 options 页面的 DevTools Console 里直接操作原始 API：

```js
// 验证 storage 可读写（不测试我们的封装函数，只确认权限和 API 正常）
await chrome.storage.local.set({ test: 'hello' })
await chrome.storage.local.get('test')   // → { test: 'hello' }
await chrome.storage.local.remove('test')
```

---

## T3: Environment Rule Matching

### 目标
实现 `matchesRules(rules, url, title)` 函数，判断当前页面是否符合任意一条环境规则，决定是否显示悬浮球。

### 关键概念
- **OR 逻辑**：多条规则之间是"满足任一即可"，用 `Array.some()` 实现——遇到第一个 `true` 立即返回，短路求值。
- **纯函数**：不依赖任何副作用，输入相同则输出相同，便于测试和复用。

### 实现说明

T3 已在 T1 写入 `src/shared/rules.ts`，无需修改。

```ts
export function matchesRules(rules: Rule[], url: string, title: string): boolean {
  if (rules.length === 0) return false;          // 无规则 → 不显示
  return rules.some(rule => {
    if (rule.type === 'url_contains')    return url.includes(rule.value);
    if (rule.type === 'title_contains')  return title.includes(rule.value);
    return false;
  });
}
```

调用方传入：
- `rules`：从 `getRules()` 读取的规则数组
- `url`：`window.location.href`（完整 URL）
- `title`：`document.title`

### 文件
| 文件 | 变更 |
|------|------|
| `src/shared/rules.ts` | 已在 T1 完成，无变更 |

### 手动测试方法

`matchesRules` 是纯函数，可以在**任意页面**的 DevTools Console 粘贴以下断言，全部输出 `true` 即为通过：

```js
function matchesRules(rules, url, title) {
  if (rules.length === 0) return false;
  return rules.some(r => {
    if (r.type === 'url_contains')   return url.includes(r.value);
    if (r.type === 'title_contains') return title.includes(r.value);
    return false;
  });
}

console.assert(matchesRules([{ type: 'url_contains', value: 'localhost' }], 'http://localhost:3000/home', 'App') === true)
console.assert(matchesRules([{ type: 'title_contains', value: 'QA' }], 'http://prod.com/home', 'QA Env') === true)
console.assert(matchesRules([{ type: 'url_contains', value: 'qacand' }], 'http://prod.com', 'Prod') === false)
console.assert(matchesRules([], 'http://localhost:3000', 'App') === false)

console.log('all passed')
```

---

## T4: Floating Widget UI

### 目标
在匹配环境规则的页面右下角注入悬浮球，包含星星图标（收藏状态）和书签图标（打开列表）。

### 关键概念
- **Shadow DOM**：`createShadowRootUi` 把 React 组件挂载在一个独立的 Shadow Root 里，与宿主页面的 CSS 完全隔离，避免样式冲突。WXT 提供这个 API 作为 `defineContentScript` 的配套工具。
- **`cssInjectionMode: 'ui'`**：告诉 WXT 把 CSS 注入到 Shadow DOM 内部，而不是页面的 `<head>`，配合 Shadow DOM 隔离使用。
- **`z-index: 2147483647`**：CSS z-index 的最大值，确保悬浮球不会被页面其他元素遮挡。
- **React 组件文件名大写**：JSX 里 `<Widget />` 才会被识别为 React 组件，`<widget />` 会被当作原生 HTML 标签，所以组件文件名按惯例大写。

### 实现步骤

#### 1. 创建 Widget.tsx — 悬浮球组件

接收三个 props：
- `isStarred`：当前 path 是否已收藏，控制星星空心/实心
- `onStarClick`：点击星星的回调（T5 实现）
- `onBookmarkClick`：点击书签图标的回调（T6 实现）

```tsx
interface WidgetProps {
  onStarClick: () => void;
  onBookmarkClick: () => void;
  isStarred: boolean;
}

export default function Widget({ onStarClick, onBookmarkClick, isStarred }: WidgetProps) {
  return (
    <div className="pathpin-widget">
      <button className={`pathpin-btn pathpin-star ${isStarred ? 'starred' : ''}`} onClick={onStarClick}>
        {isStarred ? '★' : '☆'}
      </button>
      <button className="pathpin-btn pathpin-bookmark" onClick={onBookmarkClick}>
        🔖
      </button>
    </div>
  );
}
```

#### 2. 创建 widget.css — 悬浮球样式

固定右下角，圆角卡片，Shadow DOM 内的样式不会泄漏到宿主页面：

```css
.pathpin-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  padding: 4px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
```

#### 3. 更新 index.tsx — 接入规则匹配和星星状态

页面加载时并行读取规则和书签，判断：
1. 当前页面是否匹配环境规则 → 控制悬浮球显示/隐藏
2. 当前 `pathname` 是否已收藏 → 控制星星状态

```tsx
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
```

### 文件
| 文件 | 变更 |
|------|------|
| `src/entrypoints/content/index.tsx` | 接入规则匹配 + 星星状态检查 |
| `src/entrypoints/content/Widget.tsx` | 新建，悬浮球组件 |
| `src/entrypoints/content/widget.css` | 新建，悬浮球样式 |

### 手动测试方法

1. `npm run build`，在 `chrome://extensions` 重新加载扩展
2. 在 options 页面 console 写入一条测试规则：
```js
await chrome.storage.local.set({
  rules: [{ id: crypto.randomUUID(), type: 'url_contains', value: 'localhost' }]
})
```
3. 打开任意 `http://localhost:xxxx` 页面，右下角应出现悬浮球（☆ + 🔖）
4. 打开 `https://google.com`，悬浮球不显示
5. DevTools → Elements 面板，找到 `<pathpin-widget>` 标签，展开确认 Shadow Root 结构正常

---

## T5: Save Bookmark Flow

### 目标
点击星星图标收藏/取消收藏当前页面的 path，带 title 输入弹窗。

### 关键概念
- **`window.location.pathname`**：只取 URL 的 path 部分（如 `/dashboard`），去掉 domain，这是 PathPin 的核心——跨环境复用同一条书签。
- **受控输入框**：`SavePopup` 用 `useState` 管理 title，`useRef` + `useEffect` 实现弹出时自动聚焦并全选文字，方便用户直接修改。
- **Toggle 逻辑**：星星的点击行为取决于当前状态——空心时弹出输入框走新增流程，实心时直接删除，用 `savedId` state 记住当前书签的 id 以便删除。

### 新增文件

**`SavePopup.tsx`**：title 输入弹窗组件，接收 `defaultTitle`（预填为 `document.title`）、`onConfirm`、`onCancel`。支持 Enter 确认、Escape 取消。

### 更新文件

**`index.tsx`** 新增三个 state：
- `savedId`：已收藏时记录书签 id，删除时使用
- `showPopup`：控制弹窗显示

**`widget.css`** 追加弹窗样式，定位在悬浮球上方 `bottom: 64px`。

### 核心逻辑

```ts
async function handleStarClick() {
  if (isStarred && savedId) {
    await deleteBookmark(savedId);   // 已收藏 → 直接删除
    setIsStarred(false);
    setSavedId(null);
  } else {
    setShowPopup(true);              // 未收藏 → 打开输入框
  }
}

async function handleSaveConfirm(title: string) {
  const bookmark = await addBookmark({ title, path: window.location.pathname });
  setIsStarred(true);
  setSavedId(bookmark.id);
  setShowPopup(false);
}
```

### 手动测试方法

1. `npm run build`，重新加载扩展
2. 打开匹配规则的页面（如 `localhost:xxxx`），看到悬浮球
3. 点击 ☆ → 弹出输入框，默认填入页面 title
4. 修改 title，点击 Save（或按 Enter）→ 弹框关闭，星星变 ★
5. DevTools → Application → Extension storage → 确认 `bookmarks` 里有新条目，`path` 为当前 pathname
6. 再点击 ★ → 直接删除，变回 ☆
7. 确认 Extension storage 里该条目已消失

---

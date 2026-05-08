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

## T6: Bookmark Panel

### 目标
点击 🔖 展开书签列表 Panel，支持搜索、跳转、编辑、删除，点击外部关闭。

### 关键概念
- **`e.composedPath()[0]`**：Shadow DOM 内的事件冒泡到宿主 document 时，`e.target` 只能看到宿主元素（`<pathpin-widget>`），无法判断点击是否在 Panel 内部。`e.composedPath()` 能穿透 Shadow DOM 边界，返回完整的事件路径，`[0]` 就是真实的点击目标。
- **状态同步**：Panel 删除书签后需通过 `onDeleteBookmark` 回调通知父组件，父组件据此更新星星状态，否则 Panel 和 Widget 的显示会不一致。

### 新增文件

**`Panel.tsx`**：书签列表组件。
- 搜索：`trim()` 去首尾空格，在 title 和 path 做连续子串匹配（OR）
- 默认展示按 `usageCount` 降序前 5 条；有搜索词时显示全部匹配结果
- 跳转：`window.location.href = origin + path`，跳转前调用 `incrementUsage()`
- 编辑：内联 input，Enter 保存，Escape 取消
- 外部点击关闭：用 `e.composedPath()[0]` 判断点击目标

### 更新文件

**`index.tsx`**：
- 新增 `showPanel` state，🔖 点击切换显示/隐藏
- 传入 `onDeleteBookmark` 回调，Panel 删除当前页面的书签时同步重置星星状态

**`widget.css`**：追加 Panel 样式，定位在悬浮球上方，宽 280px，最大高度 280px 可滚动。

### 手动测试方法

1. `npm run build`，重新加载扩展
2. 先收藏若干书签，或在 Extension storage 里直接写入测试数据
3. 点击 🔖 → Panel 展开，显示书签列表（按 usageCount 降序，最多 5 条）
4. 搜索框输入关键字 → 列表实时过滤（连续子串，不区分大小写）
5. 点击某条书签 → 跳转到 `origin + path`，`usageCount + 1`
6. 点击 ✎ → 内联编辑 title，Enter 保存，列表即时更新
7. 点击 ✕ → 删除该条；若删除的是当前页面的书签，星星同步变空心
8. 点击 Panel 外部 → Panel 关闭

---

## T7: Popup — Environment Rules

### 目标
点击工具栏扩展图标弹出 popup，在其中管理环境规则（添加/编辑/删除）。

### 关键概念
- **Popup vs Options Page**：popup 是点击工具栏图标弹出的小窗口，比 options page 更轻量，适合频繁配置操作。WXT 约定：在 `src/entrypoints/popup/` 目录下创建 `index.html` + `main.tsx` 即自动注册为 popup，无需修改 `wxt.config.ts`。
- **确定性 id**：rule 的 id 由 `SHA-1(type:value)` 的前 16 位 hex 生成，相同内容永远得到相同 id，import merge 时天然去重且 import 数据优先覆盖。

### 新增文件
- `src/entrypoints/popup/index.html`
- `src/entrypoints/popup/main.tsx`
- `src/entrypoints/popup/App.tsx` — 规则列表 + 添加表单，内联编辑，Enter/Escape 快捷键

### 手动测试方法

1. `npm run build`，重新加载扩展
2. 点击工具栏扩展图标，打开 popup
3. 添加规则：类型 `URL contains`，值 `localhost`，点 Add 或按 Enter → 规则出现在列表
4. DevTools → Application → Extension storage 确认 `rules` 已持久化
5. 点 Edit → 修改值 → Enter 保存，列表和 storage 同步更新
6. 点 Delete → 规则从列表和 storage 移除
7. 关闭 popup 重新打开，确认规则仍在

---

## T8: Popup — Import / Export

### 目标
在 popup 底部添加 Export / Import 按钮，支持数据备份和恢复。

### 关键概念
- **Export**：`exportData()` 读取全量数据 → `JSON.stringify` → `Blob` → `URL.createObjectURL` → 触发下载，下载完后 `revokeObjectURL` 释放内存。
- **Import merge 策略**：import 数据按 id 优先覆盖已有数据（existing 中去掉 incoming 有的 id，再拼接 incoming 全量）。bookmark id = `SHA-1(path)`，rule id = `SHA-1(type:value)`，相同内容 id 相同，重复导入不会产生多余条目。
- **`window.location.pathname`**：浏览器原生就把 query string（`?...`）和 hash（`#...`）排除在外，pathname 只包含路径部分，不需要额外处理。

### 更新文件
- `src/entrypoints/popup/App.tsx` — 追加 Export/Import 按钮，import 完成后刷新规则列表并显示状态提示
- `src/shared/storage.ts` — `importData` 去掉 mode 参数，统一为 merge-with-override 策略；`addBookmark`/`addRule` 改用 `hashId` 生成确定性 id

### 手动测试方法

1. 先收藏若干书签、添加若干规则
2. 点击 popup 里的 Export → 浏览器下载 `pathpin-data.json`，确认 JSON 包含 `bookmarks` 和 `rules`
3. 在 Extension storage 里清空数据，重新加载扩展
4. 点击 Import，选择刚导出的文件 → 显示 "Import successful"
5. 确认 Extension storage 恢复，规则列表重新出现
6. 再次导入同一文件 → 数据不重复（id 相同则覆盖，不新增）

---

## T9: SPA Navigation Awareness

### 目标
SPA 切换路由时（URL 变化但页面不刷新），重新检查规则匹配和星星状态。

### 关键概念
SPA 导航有三种方式，需要全部覆盖：

| 方式 | 触发场景 |
|---|---|
| `popstate` 事件 | 浏览器前进/后退按钮 |
| `hashchange` 事件 | Hash 路由（`#/page`） |
| `history.pushState` / `replaceState` patch | React Router、Vue Router 等现代框架的编程式导航 |

`pushState`/`replaceState` 不会触发任何原生事件，只能通过 monkey-patch 拦截。

### 实现

在 `useEffect` 里注册所有监听，`check()` 同时重置 `showPopup` 和 `showPanel`（避免导航后残留打开的弹窗）。cleanup 函数里还原 `pushState`/`replaceState`：

```ts
history.pushState = (...args) => { originalPush(...args); check(); };
history.replaceState = (...args) => { originalReplace(...args); check(); };

return () => {
  window.removeEventListener('popstate', check);
  window.removeEventListener('hashchange', check);
  history.pushState = originalPush;
  history.replaceState = originalReplace;
};
```

### 文件
| 文件 | 变更 |
|------|------|
| `src/entrypoints/content/index.tsx` | useEffect 添加三种导航事件监听 |

### 手动测试方法

需要一个本地 SPA 项目（React/Vue 等）：

1. 配置规则匹配该 SPA 的 URL
2. 在某路由（如 `/dashboard`）收藏该 path，星星显示实心 ★
3. 通过 SPA 导航切换到另一路由（如 `/settings`，未收藏）→ 星星变空心 ☆
4. 切换到不匹配规则的路由 → 悬浮球隐藏
5. 浏览器前进/后退 → 星星状态随 URL 正确更新

---

## T10: Polish & QA

### 完成的改动

**悬浮球放大 1.5 倍**：font-size、padding、border-radius 等按比例调整。

**悬浮球可拖动，位置跨页面持久化**：
- 拖拽检测：`pointerdown/move/up` 事件 + `setPointerCapture` 确保拖拽过程中鼠标移出元素也能继续跟踪
- 点击 vs 拖拽区分：移动距离超过 3px 才算拖拽，否则视为点击，避免误触发按钮
- 拖拽目标：只响应容器空白区域，按钮区域不触发（`if closest('button') return`）
- 位置坐标用 `right` + `bottom`，边界限制用 `Math.max/min` 防止拖出视口
- 上下方向：`bottom` 从底部算，鼠标向下 `dy` 为正，`bottom` 需减小（`startPos.bottom - dy`）
- 持久化：拖拽结束后存入 `chrome.storage.local`（key: `pathpin_widget_position`），页面加载时读取

### 手动测试

1. 拖拽悬浮球空白区域 → 跟随鼠标移动，方向正确
2. 松手 → 位置固定
3. 刷新页面 → 位置恢复
4. 切换到另一个匹配规则的页面 → 同一位置
5. 点击星星/书签图标 → 正常触发，不误判为拖拽
6. 拖到边缘 → 不超出视口

---

## 分享给他人

### 打包

```bash
npm run build
npx wxt zip
```

生成 `.output/pathpin-1.0.0-chrome.zip`，发给对方。

### 安装步骤（接收方）

1. 解压 zip 文件
2. 打开 `chrome://extensions`
3. 右上角开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择解压后的目录

### 注意

Chrome 禁止直接安装未经 Web Store 签名的 `.zip` / `.crx` 文件，必须解压后以开发者模式加载，这是 Google 的安全限制无法绕过。如需更方便的分发方式，需要发布到 Chrome Web Store。

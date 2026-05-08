# PathPin Chrome Extension - Task Breakdown Plan

## Context
Based on FEATURE_DESIGN.md, we need to build PathPin from scratch — a Chrome extension (MV3) that saves URL paths (not full URLs) and auto-combines with current domain, solving multi-environment bookmark duplication.

**Architecture: WXT + React + TypeScript.** WXT 专为 Chrome 扩展设计，自动处理 manifest 生成、content scripts、options page 入口，内置 HMR 调试支持。

The project directory currently has only FEATURE_DESIGN.md; no code exists yet.

## Directory Structure (WXT convention)
```
wxt.config.ts
src/
├── entrypoints/
│   ├── content/
│   │   ├── index.tsx       (content script, inject widget via Shadow DOM)
│   │   ├── Widget.tsx
│   │   └── Panel.tsx
│   └── options/
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
└── shared/
    ├── storage.ts          (chrome.storage.local CRUD)
    ├── rules.ts            (environment rule matching)
    └── types.ts            (Bookmark, Rule type definitions)
```

---

## Task List

### T1: Project Scaffold
用 WXT 初始化项目，选择 React + TypeScript 模板。

**Steps:**
- `npx wxt@latest init pathpin` → 选 React + TypeScript 模板
- 清理示例代码，建立 `src/entrypoints/content/` 和 `src/shared/` 目录结构
- 配置 `wxt.config.ts`（manifest name/description/permissions: storage）

**Files:**
- `wxt.config.ts`
- `src/entrypoints/content/index.tsx`
- `src/entrypoints/options/index.html` + `main.tsx`
- `src/shared/types.ts` (Bookmark, Rule interfaces)
- `src/shared/storage.ts`
- `src/shared/rules.ts`

**Testing:**
1. 运行 `pnpm dev`（或 `npm run dev`），WXT 自动构建并在 `.output/chrome-mv3/` 生成产物
2. 打开 `chrome://extensions`，开启开发者模式，加载 `.output/chrome-mv3/` 目录
3. 确认扩展加载成功，无红色报错
4. 修改任意文件，确认 HMR 自动刷新（无需手动重新加载扩展）

---

### T2: Storage Layer (`src/shared/storage.ts`)
Implement `chrome.storage.local` CRUD for bookmarks and rules, fully typed.

**Types (`src/shared/types.ts`):**
```ts
interface Bookmark { id: string; title: string; path: string; usageCount: number; createdAt: string }
interface Rule { id: string; type: 'url_contains' | 'title_contains'; value: string }
```

**API to implement:**
- `getBookmarks()` / `saveBookmarks(bookmarks)`
- `getRules()` / `saveRules(rules)`
- `addBookmark({title, path})` → generates uuid, usageCount=0, createdAt
- `updateBookmark(id, changes)`
- `deleteBookmark(id)`
- `incrementUsage(id)`
- `addRule({type, value})` / `updateRule(id, changes)` / `deleteRule(id)`
- `exportData()` / `importData(json, mode)` (mode: 'overwrite' | 'merge')

---

### T3: Environment Rule Matching (`src/shared/rules.ts`)
Logic to determine if current page matches any rule.

**API:**
- `matchesRules(rules, url, title)` → boolean (OR logic)
- Supports: `url_contains`, `title_contains`

**Testing:**
1. 在 DevTools console 导入 rules.ts（或直接在文件末尾临时写测试断言）
2. 验证：`matchesRules([{type:'url_contains',value:'localhost'}], 'http://localhost:3000/home', 'App')` → `true`
3. 验证：`matchesRules([{type:'title_contains',value:'QA'}], 'http://prod.com/home', 'QA Env')` → `true`
4. 验证：`matchesRules([{type:'url_contains',value:'qacand'}], 'http://prod.com', 'Prod')` → `false`
5. 验证：空 rules 数组返回 `false`

---

### T4: Floating Widget UI (`src/entrypoints/content/`)
Inject floating widget into matched pages.

**Components:**
- Floating container (fixed, bottom-right)
- Star icon (⭐): hollow/filled based on current path saved status
- Bookmark icon (📖): opens bookmark panel
- Show/hide based on environment rule match on page load/navigation

**Files:**
- `src/entrypoints/content/index.tsx` — mount React app into Shadow DOM
- `src/entrypoints/content/Widget.tsx` — floating widget component
- `src/entrypoints/content/widget.css`

**Testing:**
1. 在 storage 中添加一条 `url_contains: "localhost"` 规则（或临时让规则全匹配）
2. 打开 `http://localhost:xxxx` 任意本地页面
3. 确认右下角悬浮球可见，包含星星图标和书签图标
4. 打开一个不匹配的页面（如 `https://google.com`），确认悬浮球不显示
5. 检查 DevTools Elements 面板，确认 widget DOM 被正确注入且不影响页面布局

---

### T5: Save Bookmark Flow (content script)
When user clicks the star icon:
- If path not saved: show inline input popup (pre-filled with `document.title`)
- User edits title → confirm → call `addBookmark()`
- If path already saved: clicking star removes bookmark (toggle)
- Update star visual state

**Testing:**
1. 在匹配页面点击星星图标，确认弹出输入框且默认填入页面 title
2. 修改 title，点击确认，弹框关闭，星星变为实心/高亮
3. 打开 DevTools console 执行 `chrome.storage.local.get('bookmarks', console.log)`，确认新书签已保存，path 为当前页面 pathname
4. 再次点击实心星星，确认弹出确认或直接删除，星星恢复空心
5. 再次查询 storage，确认书签已删除

---

### T6: Bookmark Panel (content script)
When user clicks the bookmark icon:
- Panel expands upward from widget
- Search input (filter by title or path)
- Show top-5 by `usageCount` by default; filter results when searching
- Each row: title + path, click → navigate (`window.location = origin + path`), edit button, delete button
- Edit: inline title edit
- Close panel on outside click

**Testing:**
1. 先通过 T5 添加至少 2 条书签（可手动写入 storage）
2. 点击书签图标，确认 panel 向上展开，显示书签列表（按 usageCount 降序，最多5条）
3. 在搜索框输入 path 关键字，确认列表实时过滤
4. 点击某条书签，确认当前 tab 跳转到 `origin + path`，且该书签 `usageCount+1`
5. 点击编辑按钮，修改 title，确认保存后列表更新
6. 点击删除按钮，确认该条书签从列表和 storage 中移除
7. 点击 panel 外部区域，确认 panel 关闭

---

### T7: Options Page — Environment Rules (`src/entrypoints/options/`)
Settings page for managing environment rules.

**UI:**
- List of current rules (type + value) with edit/delete
- Add rule form: dropdown (URL contains / Title contains) + text input
- Save persists to storage

**Files:**
- `src/entrypoints/options/index.html`
- `src/entrypoints/options/main.tsx`
- `src/entrypoints/options/App.tsx`

**Testing:**
1. 右键扩展图标 → "选项"，打开 options 页面
2. 添加一条规则：类型 `URL contains`，值 `localhost`，点击保存
3. 确认规则出现在列表中
4. 在 DevTools console 执行 `chrome.storage.local.get('rules', console.log)` 确认已持久化
5. 编辑规则，修改值，确认列表和 storage 同步更新
6. 删除规则，确认从列表和 storage 移除
7. 关闭 options 页面重新打开，确认规则仍在（持久化验证）

---

### T8: Options Page — Import / Export
Add import/export section to options page.

**Export:** serialize `{bookmarks, rules}` → download as `pathpin-data.json`
**Import:** file picker → parse JSON → show overwrite/merge choice → call `importData()`

**Testing:**
1. 先在 storage 中存入若干书签和规则
2. 点击"导出"按钮，确认浏览器下载 `pathpin-data.json`
3. 打开下载的文件，确认 JSON 结构正确包含 `bookmarks` 和 `rules` 字段
4. 清空 storage：`chrome.storage.local.clear()`，刷新 options 页面
5. 点击"导入"，选择刚导出的 JSON 文件，选择"覆盖"模式
6. 确认书签和规则恢复，与导出前一致
7. 再次导入，选择"合并"模式，确认不重复添加已有数据（按 id 去重）

---

### T9: Content Script Navigation Awareness
Ensure floating widget state stays correct on SPA navigation (URL changes without page reload).
- Use `MutationObserver` or `navigation` API / `popstate` + `hashchange` events
- Re-check rules and star state on URL change

**Testing:**
1. 在一个 SPA 应用（如 localhost React/Vue 项目）中测试
2. 先在某路由页面（如 `/dashboard`）收藏该 path，星星显示实心
3. 通过 SPA 导航切换到另一路由（如 `/settings`，未收藏），确认星星变空心
4. 切换到一个不匹配环境规则的路由，确认悬浮球隐藏
5. 使用浏览器前进/后退按钮，确认星星状态随 URL 正确更新
6. 验证整个过程无 console 报错

---

### T10: Polish & QA
- UI style polish (Chrome native bookmark feel, minimal footprint)
- Edge cases: empty state, duplicate path detection on save
- Full end-to-end walkthrough

**Testing:**
1. **空状态**：清空所有书签，打开书签 panel，确认显示友好的空状态提示
2. **重复收藏**：尝试收藏已存在的 path，确认不重复添加（或给出提示）
3. **长文本**：title 或 path 超长时，确认 UI 不溢出（截断或换行正常）
4. **多环境切换**：分别访问匹配和不匹配规则的域名，确认悬浮球正确显示/隐藏
5. **完整流程**：配置规则 → 访问匹配页面 → 收藏 → 跳转 → 编辑 → 删除 → 导出 → 导入
6. 在 `chrome://extensions` 确认无报错，DevTools console 无异常

---

## Recommended Implementation Order
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10

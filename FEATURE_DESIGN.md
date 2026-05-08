# PathPin - Feature Design

## 1. 产品概述

一个 Chrome 扩展，解决在多环境（dev/test/staging/prod）下同一产品重复收藏书签的问题。核心思路：只保存 URL path，访问时自动拼接当前环境的 domain。

---

## 2. 核心概念

- **Path 书签**：只保存 URL 的 path 部分（如 `/home`），与 domain 解耦
- **环境识别**：通过规则判断当前页面是否属于目标环境，决定是否显示悬浮球
- **智能跳转**：点击书签时，将当前 domain + 保存的 path 拼接后在当前 tab 跳转

---

## 3. 功能模块

### 3.1 悬浮球（Floating Widget）

- 固定在页面**右下角**
- 仅在**匹配环境规则**的页面显示
- 包含两个元素：

| 元素 | 说明 |
|------|------|
| ⭐ 五角星图标（左，小） | 收藏当前页面的 path |
| 📖 书签图标（右，较大） | 展开书签列表 panel |

**五角星状态：**
- 空心：当前 path 未收藏
- 实心/高亮：当前 path 已收藏

---

### 3.2 收藏功能

1. 点击五角星
2. 弹出小输入框，默认填入当前页面 title
3. 用户可修改 title，确认后保存
4. 保存内容：`{ title, path, usageCount, createdAt }`

---

### 3.3 书签列表 Panel

点击书签图标后，**向上/向下展开**一个 panel：

- **搜索框**：支持按 URL path 或 title 关键字过滤
- **默认展示**：按使用频率排序，展示前 5 条
- **每条书签**：
  - 显示 title + path
  - 点击 → 当前 tab 跳转（domain + path 拼接）
  - 操作按钮：编辑（修改 title）、删除

---

### 3.4 环境识别规则

在**设置页面**配置，多条规则之间为 **OR** 关系，满足任意一条即显示悬浮球。

**支持的规则类型（MVP）：**

| 规则类型 | 示例 |
|----------|------|
| URL contains | `url contains "qacand"` |
| Title contains | `title contains "QA"` |

**预留扩展（未来）：**
- XPath contains element
- CSS selector contains element

**典型配置示例：**
```
url contains "qacand"
url contains "qaautocand"
url contains "engcand"
url contains "localhost"
```

---

### 3.5 设置页面

通过 Chrome 扩展的 Options Page 打开，包含：

1. **环境规则管理**
   - 添加 / 编辑 / 删除规则
   - 规则类型选择（URL contains / Title contains）

2. **数据导入/导出**
   - 导出：将书签数据和环境规则导出为 JSON 文件
   - 导入：从 JSON 文件导入，支持覆盖或合并

---

## 4. 数据存储

使用 `chrome.storage.local`（本地存储，不跨设备同步）

**数据结构：**

```json
{
  "bookmarks": [
    {
      "id": "uuid",
      "title": "Home Page",
      "path": "/home",
      "usageCount": 12,
      "createdAt": "2026-05-08T00:00:00Z"
    }
  ],
  "rules": [
    { "id": "uuid", "type": "url_contains", "value": "qacand" },
    { "id": "uuid", "type": "url_contains", "value": "localhost" },
    { "id": "uuid", "type": "title_contains", "value": "QA Env" }
  ]
}
```

---

## 5. 跳转逻辑

```
当前页面 URL: https://qacand.myapp.com/dashboard/settings
收藏的 path:  /home
跳转目标 URL: https://qacand.myapp.com/home
```

提取规则：保留 `protocol + host`，替换 path。

---

## 6. UI 风格

- 模仿 Chrome 原生书签 UI 风格
- 悬浮球尽量小巧不遮挡内容
- Panel 轻量，无需全页面跳转操作

---

## 7. MVP 范围

| 功能 | 状态 |
|------|------|
| 环境规则配置（URL/Title contains） | ✅ MVP |
| 悬浮球显示/隐藏 | ✅ MVP |
| 收藏 path（带 title 输入） | ✅ MVP |
| 五角星已收藏状态 | ✅ MVP |
| 书签列表（搜索 + 默认5条） | ✅ MVP |
| 点击跳转（当前 tab） | ✅ MVP |
| 编辑 / 删除书签 | ✅ MVP |
| 导入 / 导出数据 | ✅ MVP |
| XPath / CSS Selector 规则 | 🔜 未来 |
| 跨设备同步 | 🔜 未来 |

---

## 8. 技术栈建议

- **框架**：Vanilla JS 或 React（轻量优先）
- **存储**：`chrome.storage.local`
- **Manifest**：V3
- **Content Script**：注入悬浮球
- **Options Page**：环境规则 + 导入导出

# PathPin - Claude Notes

## chrome.storage 调试上下文

**`chrome.storage` API 只能在扩展上下文中使用，不能在普通网页的 DevTools Console 里调用。**

| 位置 | 能用 `chrome.storage` |
|---|---|
| 普通网页 console（包括 content script 所在页面） | ❌ |
| content script 代码内部 | ✅ |
| options 页面 console | ✅ |
| service worker console | ✅（需有 background script） |

**最简单的验证方式：DevTools → Application → Extension storage**
直接可视化查看/编辑所有 key/value，无需写任何代码。

如果需要在 console 里操作，使用 options 页面的 DevTools Console，且用箭头函数写法：
```js
chrome.storage.local.get('bookmarks').then(r => console.log(r))
```
注意：`.then(console.log)` 会因为 `this` 丢失导致打印 `undefined`，需用箭头函数包一层。


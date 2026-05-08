import { Bookmark, Rule, StorageData } from './types';

function generateId(): string {
  return crypto.randomUUID();
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const result = await chrome.storage.local.get('bookmarks');
  return result.bookmarks ?? [];
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await chrome.storage.local.set({ bookmarks });
}

export async function getRules(): Promise<Rule[]> {
  const result = await chrome.storage.local.get('rules');
  return result.rules ?? [];
}

export async function saveRules(rules: Rule[]): Promise<void> {
  await chrome.storage.local.set({ rules });
}

export async function addBookmark(data: { title: string; path: string }): Promise<Bookmark> {
  const bookmarks = await getBookmarks();
  const bookmark: Bookmark = {
    id: generateId(),
    title: data.title,
    path: data.path,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };
  await saveBookmarks([...bookmarks, bookmark]);
  return bookmark;
}

export async function updateBookmark(id: string, changes: Partial<Omit<Bookmark, 'id'>>): Promise<void> {
  const bookmarks = await getBookmarks();
  await saveBookmarks(bookmarks.map(b => b.id === id ? { ...b, ...changes } : b));
}

export async function deleteBookmark(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  await saveBookmarks(bookmarks.filter(b => b.id !== id));
}

export async function incrementUsage(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  await saveBookmarks(bookmarks.map(b => b.id === id ? { ...b, usageCount: b.usageCount + 1 } : b));
}

export async function addRule(data: { type: Rule['type']; value: string }): Promise<Rule> {
  const rules = await getRules();
  const rule: Rule = { id: generateId(), type: data.type, value: data.value };
  await saveRules([...rules, rule]);
  return rule;
}

export async function updateRule(id: string, changes: Partial<Omit<Rule, 'id'>>): Promise<void> {
  const rules = await getRules();
  await saveRules(rules.map(r => r.id === id ? { ...r, ...changes } : r));
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules();
  await saveRules(rules.filter(r => r.id !== id));
}

export async function exportData(): Promise<StorageData> {
  const [bookmarks, rules] = await Promise.all([getBookmarks(), getRules()]);
  return { bookmarks, rules };
}

export async function importData(json: StorageData, mode: 'overwrite' | 'merge'): Promise<void> {
  if (mode === 'overwrite') {
    await chrome.storage.local.set({ bookmarks: json.bookmarks, rules: json.rules });
  } else {
    const [existingBookmarks, existingRules] = await Promise.all([getBookmarks(), getRules()]);
    const existingBookmarkIds = new Set(existingBookmarks.map(b => b.id));
    const existingRuleIds = new Set(existingRules.map(r => r.id));
    const mergedBookmarks = [...existingBookmarks, ...json.bookmarks.filter(b => !existingBookmarkIds.has(b.id))];
    const mergedRules = [...existingRules, ...json.rules.filter(r => !existingRuleIds.has(r.id))];
    await chrome.storage.local.set({ bookmarks: mergedBookmarks, rules: mergedRules });
  }
}

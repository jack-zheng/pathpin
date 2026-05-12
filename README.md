# PathPin

A Chrome extension that saves URL **paths** instead of full URLs, solving the problem of duplicate bookmarks across multiple environments.

## The Problem

When working across multiple environments, you end up saving the same page multiple times:

- `https://dev.myapp.com/dashboard`
- `http://localhost:8080/dashboard`
- `https://qa.myapp.com/dashboard`
- `https://prod.myapp.com/dashboard`

## The Solution

PathPin saves only the path (e.g. `/dashboard`). When you click a bookmark, it combines the saved path with the **current domain**, so one bookmark works across all environments.

## Features

- **Floating widget** — appears on pages matching your environment rules
- **Save path** — click the star to bookmark the current path with a custom title
- **Bookmark panel** — search, navigate, edit, and delete bookmarks
- **Environment rules** — configure URL/domain patterns to control where the widget shows
- **Draggable widget** — drag to reposition, position persists across pages
- **Keyboard shortcuts** — star, search, and navigate without touching the mouse

## Installation

This extension is not published on the Chrome Web Store. To install it locally:

```bash
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` directory

## Usage

1. Click the extension icon in the toolbar to open the popup
2. Add an environment rule (e.g. `Domain equals: localhost`)
3. Visit a matching page — the floating widget appears in the bottom-right corner
4. Click ☆ to save the current path
5. Click the bookmark icon to open the panel and navigate

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌥ S` | Star / unstar current page |
| `⌥ B` | Search bookmarks |
| `⌥ H` | Toggle floating widget |
| `⌥ /` | Show all shortcuts |

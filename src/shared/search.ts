/**
 * Split query into tokens by whitespace, filter empty strings.
 */
export function parseTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Returns true if text matches ALL tokens (AND logic).
 */
export function matchesTokens(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.every(t => lower.includes(t));
}

/**
 * Highlights all token matches in text by wrapping them in <strong>.
 * Returns an array of React-renderable parts.
 */
export function highlight(text: string, tokens: string[]): (string | { bold: string })[] {
  if (!tokens.length) return [text];
  // Build a regex that matches any token (case-insensitive)
  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map(part =>
    tokens.some(t => part.toLowerCase() === t.toLowerCase()) ? { bold: part } : part
  );
}

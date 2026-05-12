import { Rule } from './types';

export function matchesRules(rules: Rule[], url: string, title: string): boolean {
  if (rules.length === 0) return false;
  return rules.some(rule => {
    if (rule.type === 'url_contains') {
      return url.toLowerCase().includes(rule.value.toLowerCase());
    }
    if (rule.type === 'domain_equals') {
      try {
        const domain = new URL(url).hostname;
        return domain.toLowerCase() === rule.value.toLowerCase();
      } catch {
        return false;
      }
    }
    return false;
  });
}

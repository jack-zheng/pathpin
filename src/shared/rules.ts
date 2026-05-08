import { Rule } from './types';

export function matchesRules(rules: Rule[], url: string, title: string): boolean {
  if (rules.length === 0) return false;
  return rules.some(rule => {
    if (rule.type === 'url_contains') {
      return url.toLowerCase().includes(rule.value.toLowerCase());
    }
    if (rule.type === 'title_contains') {
      return title.toLowerCase().includes(rule.value.toLowerCase());
    }
    return false;
  });
}

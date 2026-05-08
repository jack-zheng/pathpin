import { Rule } from './types';

export function matchesRules(rules: Rule[], url: string, title: string): boolean {
  if (rules.length === 0) return false;
  return rules.some(rule => {
    if (rule.type === 'url_contains') {
      return url.includes(rule.value);
    }
    if (rule.type === 'title_contains') {
      return title.includes(rule.value);
    }
    return false;
  });
}

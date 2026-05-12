import { highlight } from '../../shared/search';

export default function Highlighted({ text, tokens }: { text: string; tokens: string[] }) {
  const parts = highlight(text, tokens);
  return <>{parts.map((p, i) => typeof p === 'string' ? <span key={i}>{p}</span> : <strong key={i}>{p.bold}</strong>)}</>;
}

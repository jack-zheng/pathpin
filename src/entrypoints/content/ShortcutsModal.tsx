import { useRef } from 'react';
import { useOutsideClick } from './useOutsideClick';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['⌥', 'S'], desc: 'Star / unstar current page' },
  { keys: ['⌥', 'B'], desc: 'Search bookmarks' },
  { keys: ['⌥', 'H'], desc: 'Toggle floating widget' },
  { keys: ['⌥', '/'], desc: 'Show shortcuts' },
];

export default function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onClose);

  return (
    <div className="pathpin-quick-modal pathpin-shortcuts-modal" ref={ref}>
      <div className="pathpin-shortcuts-title">Keyboard Shortcuts</div>
      <ul className="pathpin-shortcuts-list">
        {SHORTCUTS.map(({ keys, desc }) => (
          <li key={desc} className="pathpin-shortcuts-item">
            <span className="pathpin-shortcuts-keys">
              {keys.map((k, i) => <kbd key={i}>{k}</kbd>)}
            </span>
            <span className="pathpin-shortcuts-desc">{desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

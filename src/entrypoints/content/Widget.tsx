import './widget.css';

interface WidgetProps {
  onStarClick: () => void;
  onBookmarkClick: () => void;
  isStarred: boolean;
}

export default function Widget({ onStarClick, onBookmarkClick, isStarred }: WidgetProps) {
  return (
    <div className="pathpin-widget">
      <button
        className={`pathpin-btn pathpin-star ${isStarred ? 'starred' : ''}`}
        onClick={onStarClick}
        title={isStarred ? 'Remove bookmark' : 'Save path'}
      >
        {isStarred ? '★' : '☆'}
      </button>
      <button
        className="pathpin-btn pathpin-bookmark"
        onClick={onBookmarkClick}
        title="Open bookmarks"
      >
        🔖
      </button>
    </div>
  );
}

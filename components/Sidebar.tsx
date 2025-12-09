export default function Sidebar({ onDeleteCollection }) {
  return <div>
    <button data-testid='delete-col-btn' onClick={() => onDeleteCollection('1')}>Delete Col 1</button>
  </div>;
}

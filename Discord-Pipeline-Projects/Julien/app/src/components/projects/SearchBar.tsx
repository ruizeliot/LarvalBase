import { useProjectStore } from '@/stores/projectStore';
import './SearchBar.css';

export function SearchBar() {
  const searchQuery = useProjectStore((s) => s.searchQuery);
  const setSearchQuery = useProjectStore((s) => s.setSearchQuery);
  const sortBy = useProjectStore((s) => s.sortBy);
  const setSortBy = useProjectStore((s) => s.setSortBy);
  const sortOrder = useProjectStore((s) => s.sortOrder);
  const setSortOrder = useProjectStore((s) => s.setSortOrder);

  const handleSortClick = (newSortBy: 'name' | 'date') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-bar__input"
        placeholder="Rechercher un projet..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="search-bar__sort">
        <span className="search-bar__sort-label">Trier par :</span>
        <button
          className={`search-bar__sort-btn ${sortBy === 'date' ? 'active' : ''}`}
          onClick={() => handleSortClick('date')}
        >
          Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button
          className={`search-bar__sort-btn ${sortBy === 'name' ? 'active' : ''}`}
          onClick={() => handleSortClick('name')}
        >
          Nom {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>
    </div>
  );
}

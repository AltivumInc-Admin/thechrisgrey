import { KB_CATEGORIES } from '../../hooks';
import type { KbEntry } from '../../hooks';
import EntryForm from './EntryForm';
import Icon from '../icons/Icon';

export interface EntryListProps {
  entries: KbEntry[];
  editingEntry: KbEntry | null;
  deleteConfirm: string | null;
  onEdit: (entry: KbEntry) => void;
  onCancelEdit: () => void;
  onUpdate: (data: Omit<KbEntry, '_id' | '_createdAt' | '_updatedAt'>) => Promise<void>;
  onDelete: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onCancelDelete: () => void;
  onToggleActive: (entry: KbEntry) => void;
  isLoading: boolean;
}

function EntryList({
  entries,
  editingEntry,
  deleteConfirm,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onDeleteConfirm,
  onCancelDelete,
  onToggleActive,
  isLoading,
}: EntryListProps) {
  // Group entries by category
  const grouped = entries.reduce<Record<string, KbEntry[]>>((acc, entry) => {
    const cat = entry.category || 'biography';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {});

  return (
    <>
      {/* Loading state */}
      {isLoading && entries.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-altivum-gold/30 border-t-altivum-gold rounded-full animate-spin" />
        </div>
      )}

      {/* Entry list grouped by category */}
      {KB_CATEGORIES.map((cat) => {
        const items = grouped[cat.value];
        if (!items || items.length === 0) return null;

        return (
          <div key={cat.value} className="mb-10">
            <h2 className="text-white text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-altivum-gold" />
              {cat.label}
              <span className="text-altivum-silver font-normal">({items.length})</span>
            </h2>

            <div className="space-y-3">
              {items.map((entry) =>
                editingEntry?._id === entry._id ? (
                  <div key={entry._id}>
                    <EntryForm initial={entry} onSave={onUpdate} onCancel={onCancelEdit} />
                  </div>
                ) : (
                  <div
                    key={entry._id}
                    className={`p-4 border rounded-lg transition-colors ${
                      entry.isActive
                        ? 'bg-altivum-navy/30 border-white/5'
                        : 'bg-altivum-dark/50 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-white text-sm font-medium truncate">{entry.title}</h3>
                          {entry.date && (
                            <span className="text-altivum-silver text-xs shrink-0">
                              {new Date(entry.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                          {!entry.isActive && (
                            <span className="text-xs text-altivum-silver bg-white/5 px-2 py-0.5 rounded-sm">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-altivum-silver text-sm line-clamp-2">{entry.content}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onToggleActive(entry)}
                          className="p-1.5 text-altivum-silver hover:text-altivum-gold transition-colors"
                          aria-label={entry.isActive ? 'Deactivate' : 'Activate'}
                          title={entry.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Icon name={entry.isActive ? 'visibility' : 'visibility_off'} className="text-lg" />
                        </button>
                        <button
                          onClick={() => onEdit(entry)}
                          className="p-1.5 text-altivum-silver hover:text-white transition-colors"
                          aria-label="Edit"
                        >
                          <Icon name="edit" className="text-lg" />
                        </button>
                        {deleteConfirm === entry._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onDelete(entry._id)}
                              className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                              aria-label="Confirm delete"
                            >
                              <Icon name="check" className="text-lg" />
                            </button>
                            <button
                              onClick={onCancelDelete}
                              className="p-1.5 text-altivum-silver hover:text-white transition-colors"
                              aria-label="Cancel delete"
                            >
                              <Icon name="close" className="text-lg" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onDeleteConfirm(entry._id)}
                            className="p-1.5 text-altivum-silver hover:text-red-400 transition-colors"
                            aria-label="Delete"
                          >
                            <Icon name="delete" className="text-lg" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <div className="text-center py-20">
          <Icon name="library_books" className="text-5xl text-altivum-silver mb-4 block" />
          <p className="text-altivum-silver mb-2">No entries yet</p>
          <p className="text-altivum-silver text-sm">Add your first Knowledge Base entry to get started.</p>
        </div>
      )}
    </>
  );
}

export default EntryList;

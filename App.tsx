import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import BookmarkCard from './components/BookmarkCard';
import AddBookmarkModal from './components/AddBookmarkModal';
import AddCollectionModal from './components/AddCollectionModal';
import PrivateVaultAuth from './components/PrivateVaultAuth';
import BookmarkDetailModal from './components/BookmarkDetailModal';
import ConfirmModal from './components/ConfirmModal';
import SettingsModal from './components/SettingsModal';
import SetupPinModal from './components/SetupPinModal';
import { Bookmark, Collection } from './types';
import { App as CapacitorApp } from '@capacitor/app';
import {
  Menu,
  Search,
  Grid,
  List,
  Plus,
  Filter,
  ShieldCheck,
  WifiOff,
  X,
  Check
} from 'lucide-react';

// Mock Data
const INITIAL_COLLECTIONS: Collection[] = [
  { id: '1', name: 'Work', icon: 'Briefcase', color: 'bg-blue-500' },
  { id: '2', name: 'Design Inspiration', icon: 'Palette', color: 'bg-purple-500' },
  { id: '3', name: 'Recipes', icon: 'Coffee', color: 'bg-green-500' },
];

const INITIAL_BOOKMARKS: Bookmark[] = [
  {
    id: 'b1',
    url: 'https://react.dev',
    title: 'React - The Library for Web and Native User Interfaces',
    description: 'The official documentation for React, a JavaScript library for building user interfaces.',
    tags: ['dev', 'frontend', 'javascript'],
    collectionId: '1',
    isPrivate: false,
    isPinned: true,
    createdAt: Date.now(),
    imageUrl: 'https://picsum.photos/seed/react/800/600'
  },
  {
    id: 'b2',
    url: 'https://tailwindcss.com',
    title: 'Tailwind CSS - Rapidly build modern websites without ever leaving your HTML',
    description: 'A utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90.',
    tags: ['css', 'design', 'ui'],
    collectionId: '2',
    isPrivate: false,
    isPinned: false,
    createdAt: Date.now() - 100000,
    imageUrl: 'https://picsum.photos/seed/tailwind/800/600'
  },
  {
    id: 'b3',
    url: 'https://secret-project.com',
    title: 'Top Secret Project Specs',
    description: 'Internal documentation for the next big launch.',
    tags: ['confidential', 'work'],
    collectionId: '1',
    isPrivate: true,
    isPinned: false,
    createdAt: Date.now() - 500000,
    imageUrl: 'https://picsum.photos/seed/secret/800/600'
  }
];

const App: React.FC = () => {
  // Persistence Initialization
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem('bv_bookmarks');
      return saved ? JSON.parse(saved) : INITIAL_BOOKMARKS;
    } catch {
      return INITIAL_BOOKMARKS;
    }
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem('bv_collections');
      return saved ? JSON.parse(saved) : INITIAL_COLLECTIONS;
    } catch {
      return INITIAL_COLLECTIONS;
    }
  });

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('bv_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // UI State
  const [activeCollection, setActiveCollection] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Immediate input value
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // View/Edit State
  const [viewingBookmark, setViewingBookmark] = useState<Bookmark | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  // Filter State
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);

  // Private Vault State
  const [privateModeUnlocked, setPrivateModeUnlocked] = useState(false);
  const [showPrivateAuth, setShowPrivateAuth] = useState(false);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; bookmarkId: string | null }>({
    isOpen: false,
    bookmarkId: null
  });

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add Collection Modal State
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);

  // First-time PIN Setup State (also triggers if old 4-digit PIN exists)
  const [needsPinSetup, setNeedsPinSetup] = useState(() => {
    const storedPin = localStorage.getItem('bv_vault_pin');
    // Show setup if no PIN exists OR if PIN is less than 6 digits (migration from old 4-digit)
    return !storedPin || storedPin.length < 6;
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('bv_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('bv_collections', JSON.stringify(collections));
  }, [collections]);

  // Theme Effect
  useEffect(() => {
    localStorage.setItem('bv_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Online/Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Debounce search input - only update searchQuery after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Refs to track current modal/sidebar state for back button
  const stateRef = React.useRef({
    viewingBookmark,
    isAddModalOpen,
    editingBookmark,
    showPrivateAuth,
    deleteConfirmOpen: deleteConfirm.isOpen,
    isSettingsOpen,
    isAddCollectionOpen,
    isFilterMenuOpen,
    isSidebarOpen,
    activeCollection
  });

  // Update refs when state changes
  React.useEffect(() => {
    stateRef.current = {
      viewingBookmark,
      isAddModalOpen,
      editingBookmark,
      showPrivateAuth,
      deleteConfirmOpen: deleteConfirm.isOpen,
      isSettingsOpen,
      isAddCollectionOpen,
      isFilterMenuOpen,
      isSidebarOpen,
      activeCollection
    };
  }, [
    viewingBookmark,
    isAddModalOpen,
    editingBookmark,
    showPrivateAuth,
    deleteConfirm.isOpen,
    isSettingsOpen,
    isAddCollectionOpen,
    isFilterMenuOpen,
    isSidebarOpen,
    activeCollection
  ]);

  // Handle Android back button - register once, use refs for current state
  useEffect(() => {
    let backButtonListener: any;

    const setupBackButton = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', () => {
        const state = stateRef.current;
        console.log('Back button pressed, sidebar open:', state.isSidebarOpen);

        // Priority order: Close modals/overlays first, then sidebar, then exit app
        if (state.viewingBookmark !== null) {
          console.log('Closing bookmark detail');
          setViewingBookmark(null);
        } else if (state.isAddModalOpen || state.editingBookmark !== null) {
          console.log('Closing add/edit modal');
          setIsAddModalOpen(false);
          setEditingBookmark(null);
        } else if (state.showPrivateAuth) {
          console.log('Closing private auth');
          setShowPrivateAuth(false);
        } else if (state.deleteConfirmOpen) {
          console.log('Closing delete confirm');
          setDeleteConfirm({ isOpen: false, bookmarkId: null });
        } else if (state.isSettingsOpen) {
          console.log('Closing settings');
          setIsSettingsOpen(false);
        } else if (state.isAddCollectionOpen) {
          console.log('Closing add collection');
          setIsAddCollectionOpen(false);
        } else if (state.isFilterMenuOpen) {
          console.log('Closing filter menu');
          setIsFilterMenuOpen(false);
        } else if (state.isSidebarOpen) {
          console.log('Closing sidebar');
          setIsSidebarOpen(false);
        } else if (state.activeCollection !== 'all') {
          console.log('Navigating back to Library');
          setActiveCollection('all');
        } else {
          console.log('Exiting app - nothing open');
          CapacitorApp.exitApp();
        }
      });
    };

    setupBackButton();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, []); // Only register once

  // Compute all unique tags for filter (from bookmarks + custom tags)
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    // Add tags from bookmarks
    bookmarks.forEach(b => {
      if (!b.isPrivate || privateModeUnlocked) {
        b.tags.forEach(t => tags.add(t));
      }
    });
    // Add custom tags
    customTags.forEach(t => tags.add(t));
    return Array.from(tags).sort();
  }, [bookmarks, privateModeUnlocked, customTags]);

  // Computed
  const filteredBookmarks = useMemo(() => {
    let filtered = bookmarks;

    // 1. Filter by Private/Public
    if (activeCollection === 'private') {
      if (!privateModeUnlocked) return []; // Should be blocked by UI, but double check
      filtered = filtered.filter(b => b.isPrivate);
    } else {
      // In normal views, hide private bookmarks unless unlocked? 
      // Typically private bookmarks are ONLY in the private folder.
      filtered = filtered.filter(b => !b.isPrivate);

      // 2. Filter by Collection
      if (activeCollection === 'favorites') {
        filtered = filtered.filter(b => b.isPinned); // Using pinned as favorites for simplicity
      } else if (activeCollection !== 'all') {
        filtered = filtered.filter(b => b.collectionId === activeCollection);
      }
    }

    // 3. Filter by Tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(b =>
        b.tags.some(tag => selectedTags.includes(tag))
      );
    }

    // 4. Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // 5. Sort (Pinned first)
    return filtered.sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  }, [bookmarks, activeCollection, searchQuery, privateModeUnlocked, selectedTags]);


  // Handlers
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleAddBookmark = (newBookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const id = Math.random().toString(36).substr(2, 9);

    // Handle pending collection selection - create the collection first
    let collectionId = newBookmark.collectionId;
    if (collectionId.startsWith('pending-')) {
      const collectionName = collectionId.replace('pending-', '');

      // Check if collection with same name already exists
      const existingCol = collections.find(c => c.name.toLowerCase() === collectionName.toLowerCase());
      if (existingCol) {
        collectionId = existingCol.id;
      } else {
        const newColId = Math.random().toString(36).substr(2, 9);
        const newCol: Collection = {
          id: newColId,
          name: collectionName,
          icon: 'Folder',
          color: 'bg-blue-500'
        };
        setCollections(prev => [...prev, newCol]);
        collectionId = newColId;
      }
    }

    setBookmarks(prev => [{ ...newBookmark, id, createdAt: Date.now(), collectionId }, ...prev]);
  };

  const handleEditBookmark = (id: string, updates: Omit<Bookmark, 'id' | 'createdAt'>) => {
    // Handle pending collection selection - create the collection first
    let collectionId = updates.collectionId;
    if (collectionId.startsWith('pending-')) {
      const collectionName = collectionId.replace('pending-', '');

      // Check if collection with same name already exists
      const existingCol = collections.find(c => c.name.toLowerCase() === collectionName.toLowerCase());
      if (existingCol) {
        collectionId = existingCol.id;
      } else {
        const newColId = Math.random().toString(36).substr(2, 9);
        const newCol: Collection = {
          id: newColId,
          name: collectionName,
          icon: 'Folder',
          color: 'bg-blue-500'
        };
        setCollections(prev => [...prev, newCol]);
        collectionId = newColId;
      }
    }

    setBookmarks(prev => prev.map(b =>
      b.id === id ? { ...b, ...updates, collectionId } : b
    ));
    setEditingBookmark(null);
  };

  // Open delete confirmation modal
  const handleDeleteBookmark = (id: string) => {
    // Close the detail modal first if it's open
    if (viewingBookmark?.id === id) {
      setViewingBookmark(null);
    }
    // Open the confirmation modal
    setDeleteConfirm({ isOpen: true, bookmarkId: id });
  };

  // Confirm and execute the deletion
  const confirmDelete = () => {
    if (deleteConfirm.bookmarkId) {
      setBookmarks(prev => prev.filter(b => b.id !== deleteConfirm.bookmarkId));
    }
    setDeleteConfirm({ isOpen: false, bookmarkId: null });
  };

  // Cancel the deletion
  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, bookmarkId: null });
  };

  const handleTogglePin = (id: string) => {
    setBookmarks(prev => prev.map(b =>
      b.id === id ? { ...b, isPinned: !b.isPinned } : b
    ));
    if (viewingBookmark?.id === id) {
      setViewingBookmark(prev => prev ? { ...prev, isPinned: !prev.isPinned } : null);
    }
  };

  const handleCreateCollection = () => {
    setIsAddCollectionOpen(true);
  };

  const handleAddCollection = (name: string, color: string) => {
    // Check for duplicate collection names (case-insensitive)
    const exists = collections.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      console.log('Collection already exists:', name);
      return; // Don't create duplicate
    }

    const newCol: Collection = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      icon: 'Folder',
      color
    };
    setCollections(prev => [...prev, newCol]);
  };

  const handleMoveBookmark = (id: string) => {
    const collectionName = prompt("Enter Collection Name to move to (exact match):");
    const targetCol = collections.find(c => c.name.toLowerCase() === collectionName?.toLowerCase());

    if (targetCol) {
      setBookmarks(prev => prev.map(b => b.id === id ? { ...b, collectionId: targetCol.id } : b));
    } else if (collectionName) {
      alert("Collection not found.");
    }
  };

  const onSelectPrivate = () => {
    setIsSidebarOpen(false);
    if (privateModeUnlocked) {
      setActiveCollection('private');
    } else {
      setShowPrivateAuth(true);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Filter Menu Overlay - Closes menu when clicking outside */}
      {isFilterMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsFilterMenuOpen(false)}
        />
      )}

      {/* Sidebar - z-60 ensures it covers the header (z-50) and overlays on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-[60] w-64 bg-white dark:bg-gray-900 shadow-xl dark:shadow-black/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          collections={collections}
          activeCollection={activeCollection}
          onSelectCollection={(id) => {
            setActiveCollection(id);
            setIsSidebarOpen(false);
          }}
          isPrivateUnlocked={privateModeUnlocked}
          onTogglePrivate={onSelectPrivate}
          onCreateCollection={handleCreateCollection}
          onDeleteCollection={(id) => {
            // If we're viewing the collection being deleted, go back to 'all'
            if (activeCollection === id) {
              setActiveCollection('all');
            }
            // Move bookmarks in this collection to 'all' (uncategorized)
            setBookmarks(prev => prev.map(b =>
              b.collectionId === id ? { ...b, collectionId: 'all' } : b
            ));
            setCollections(prev => prev.filter(c => c.id !== id));
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Top Bar - Fixed header without backdrop-blur for better scroll performance. Hidden when Private Vault auth is showing */}
        {!showPrivateAuth && <header className={`h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 ${isFilterMenuOpen ? 'z-50' : 'z-10'}`}>
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => { setIsSidebarOpen(true); setIsFilterMenuOpen(false); }}
              className="lg:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Menu size={20} />
            </button>

            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search bookmarks..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-600 outline-none text-sm transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-2 transition-colors">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                <List size={18} />
              </button>
            </div>

            <div className="relative z-50">
              <button
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isFilterMenuOpen || selectedTags.length > 0 ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <Filter size={20} className={selectedTags.length > 0 ? "fill-primary-600 dark:fill-primary-400" : ""} />
                {selectedTags.length > 0 && (
                  <span className="text-xs font-bold bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 px-1.5 py-0.5 rounded-md">{selectedTags.length}</span>
                )}
              </button>

              {isFilterMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-black/40 border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filter by Tags</span>
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Add New Tag Input */}
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Add new tag..."
                        id="new-tag-input"
                        className="flex-1 min-w-0 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.currentTarget;
                            const newTag = input.value.trim().toLowerCase();
                            if (newTag) {
                              // Add to custom tags if it doesn't exist
                              if (!allTags.includes(newTag)) {
                                setCustomTags(prev => [...prev, newTag]);
                              }
                              // Select the tag if not already selected
                              if (!selectedTags.includes(newTag)) {
                                setSelectedTags(prev => [...prev, newTag]);
                              }
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const input = document.getElementById('new-tag-input') as HTMLInputElement;
                          const newTag = input?.value.trim().toLowerCase();
                          if (newTag) {
                            // Add to custom tags if it doesn't exist
                            if (!allTags.includes(newTag)) {
                              setCustomTags(prev => [...prev, newTag]);
                            }
                            // Select the tag if not already selected
                            if (!selectedTags.includes(newTag)) {
                              setSelectedTags(prev => [...prev, newTag]);
                            }
                            input.value = '';
                            input.focus();
                          }
                        }}
                        className="flex-shrink-0 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">Press Enter or click + to add</p>
                  </div>

                  <div className="p-3 max-h-60 overflow-y-auto custom-scrollbar">
                    {allTags.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">No tags available</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => {
                          const isSelected = selectedTags.includes(tag);
                          const isCustomTag = customTags.includes(tag);
                          return (
                            <div key={tag} className="relative group/tag">
                              <button
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-1.5 ${isSelected
                                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 shadow-sm'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                              >
                                {isSelected && <Check size={12} />}
                                {tag}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Remove from custom tags
                                  setCustomTags(prev => prev.filter(t => t !== tag));
                                  // Remove from selected tags
                                  setSelectedTags(prev => prev.filter(t => t !== tag));
                                  // Remove tag from all bookmarks that have it
                                  setBookmarks(prev => prev.map(b => ({
                                    ...b,
                                    tags: b.tags.filter(t => t !== tag)
                                  })));
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover/tag:opacity-100 transition-opacity shadow-sm"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>}

        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-1 text-xs text-center flex items-center justify-center gap-2">
            <WifiOff size={12} />
            <span>You are offline. AI features are unavailable, but you can access your saved bookmarks.</span>
          </div>
        )}

        {/* Mobile Search Bar (Below Header) - Hidden when Private Vault auth is showing */}
        {!showPrivateAuth && <div className="sm:hidden px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm outline-none text-gray-900 dark:text-gray-100"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>}

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 relative" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* Header Title for Section */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white capitalize transition-colors">
              {activeCollection === 'all' ? 'Library' :
                activeCollection === 'favorites' ? 'Favorites' :
                  activeCollection === 'private' ? 'Private Vault' :
                    collections.find(c => c.id === activeCollection)?.name || 'Collection'}
            </h2>
            {activeCollection === 'private' && privateModeUnlocked && (
              <button
                onClick={() => { setPrivateModeUnlocked(false); setActiveCollection('all'); }}
                className="flex items-center gap-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-full transition-colors"
              >
                <ShieldCheck size={14} /> Lock Vault
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Filtered by:</span>
              {selectedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-semibold hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                >
                  {tag}
                  <X size={12} className="opacity-60 hover:opacity-100" />
                </button>
              ))}
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline ml-2 decoration-dotted"
              >
                Clear
              </button>
            </div>
          )}
          {selectedTags.length === 0 && <div className="mb-6"></div>}

          {/* Private Auth Overlay for main content if strictly navigating */}
          {activeCollection === 'private' && !privateModeUnlocked && !showPrivateAuth && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <p>Locked</p>
            </div>
          )}

          {/* Auth Modal */}
          {showPrivateAuth && (
            <PrivateVaultAuth
              onUnlock={() => {
                setPrivateModeUnlocked(true);
                setShowPrivateAuth(false);
                setActiveCollection('private');
              }}
              onClose={() => setShowPrivateAuth(false)}
              onResetPin={() => {
                setShowPrivateAuth(false);
                setNeedsPinSetup(true);
              }}
            />
          )}

          {/* Grid/List */}
          {filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 transition-colors">
                <Search size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">No bookmarks found</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-2">
                Try adjusting your filters or add a new bookmark to get started.
              </p>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="mt-4 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm"
                >
                  Clear all active filters
                </button>
              )}
            </div>
          ) : (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredBookmarks.map(bm => (
                <BookmarkCard
                  key={bm.id}
                  bookmark={bm}
                  viewMode={viewMode}
                  onDelete={handleDeleteBookmark}
                  onTogglePin={handleTogglePin}
                  onEdit={() => { }}
                  onMove={handleMoveBookmark}
                  onView={() => setViewingBookmark(bm)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Floating Action Button - Hidden when Private Vault auth is showing */}
        {!showPrivateAuth && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-500 dark:to-indigo-500 rounded-2xl shadow-xl shadow-primary-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all z-20 group"
          >
            <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}

      </div>

      {/* Add/Edit Modal */}
      <AddBookmarkModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBookmark(null);
        }}
        onAdd={handleAddBookmark}
        onEdit={handleEditBookmark}
        onDelete={handleDeleteBookmark}
        onAddCollection={(name) => {
          const newCol: Collection = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            icon: 'Folder',
            color: 'bg-blue-500'
          };
          setCollections(prev => [...prev, newCol]);
        }}
        onDeleteCollection={(id) => {
          if (activeCollection === id) {
            setActiveCollection('all');
          }
          setCollections(prev => prev.filter(c => c.id !== id));
        }}
        editBookmark={editingBookmark}
        collections={collections}
        existingTags={allTags}
      />

      {/* Detail View Modal */}
      {viewingBookmark && (
        <BookmarkDetailModal
          bookmark={viewingBookmark}
          collection={collections.find(c => c.id === viewingBookmark.collectionId)}
          onClose={() => setViewingBookmark(null)}
          onDelete={handleDeleteBookmark}
          onTogglePin={handleTogglePin}
          onEdit={(bookmark) => {
            setViewingBookmark(null);
            setEditingBookmark(bookmark);
            setIsAddModalOpen(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Bookmark"
        message="Are you sure you want to delete this bookmark? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* First-time PIN Setup Modal */}
      <SetupPinModal
        isOpen={needsPinSetup}
        onComplete={() => setNeedsPinSetup(false)}
      />

      {/* Add Collection Modal */}
      <AddCollectionModal
        isOpen={isAddCollectionOpen}
        onClose={() => setIsAddCollectionOpen(false)}
        onAdd={handleAddCollection}
      />

    </div>
  );
};

export default App;
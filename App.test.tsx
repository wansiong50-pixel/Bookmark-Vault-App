
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import React from 'react';

// Mock Capacitor
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Menu: () => <div>Menu</div>,
  Search: () => <div>Search</div>,
  Grid: () => <div>Grid</div>,
  List: () => <div>List</div>,
  Plus: () => <div>Plus</div>,
  Filter: () => <div>Filter</div>,
  ShieldCheck: () => <div>ShieldCheck</div>,
  WifiOff: () => <div>WifiOff</div>,
  X: () => <div>X</div>,
  Check: () => <div>Check</div>,
}));

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store[key] || null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function () {
      store = {};
    },
    removeItem: function (key: string) {
      delete store[key];
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('verifies the Orphaned Bookmarks bug', async () => {
    // 1. Setup initial state with a specific bookmark in a collection
    const initialCollections = [
      { id: '1', name: 'Work', icon: 'Briefcase', color: 'bg-blue-500' }
    ];
    const initialBookmarks = [
      {
        id: 'b1',
        url: 'https://example.com',
        title: 'Example',
        description: 'Desc',
        tags: [],
        collectionId: '1',
        isPrivate: false,
        isPinned: false,
        createdAt: Date.now()
      }
    ];

    localStorage.setItem('bv_collections', JSON.stringify(initialCollections));
    localStorage.setItem('bv_bookmarks', JSON.stringify(initialBookmarks));

    render(<App />);

    // Verify bookmark exists and is in collection '1'
    // Since we mocked components, we can't easily check UI, but we can check state via localStorage update?
    // App updates localStorage on state change.

    // Trigger delete collection via mocked Sidebar button
    const deleteBtn = screen.getByTestId('delete-col-btn');
    fireEvent.click(deleteBtn);

    // Allow effects to run
    await act(async () => {});

    // Verify collection is gone
    const collections = JSON.parse(localStorage.getItem('bv_collections') || '[]');
    expect(collections.find((c: any) => c.id === '1')).toBeUndefined();

    // Verify bookmark state
    const bookmarks = JSON.parse(localStorage.getItem('bv_bookmarks') || '[]');
    const bookmark = bookmarks.find((b: any) => b.id === 'b1');

    expect(bookmark).toBeDefined();

    // BUG FIX ASSERTION: The bookmark should now be moved to 'all'
    expect(bookmark.collectionId).toBe('all');

    console.log('Bookmark collectionId is:', bookmark.collectionId);
  });
});

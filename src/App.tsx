import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Upload, Github, Plus } from 'lucide-react';
import { Page, CopyItem, GitHubConfig } from './types';
import { PageSelector } from './components/PageSelector';
import { CopyItemCard } from './components/CopyItemCard';
import { GitHubSettings } from './components/GitHubSettings';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { api } from './utils/api';

// Mock data
const initialPages: Page[] = [
  {
    id: '1',
    name: 'Home Page',
    path: 'home.json',
    lastSynced: '2025-11-18T10:30:00Z',
    copyItems: [
      {
        id: '1-1',
        key: 'hero.title',
        figmaText: 'Welcome to Our Amazing Product',
        savedText: 'Welcome to Our Product',
        lastSynced: '2025-11-18T10:30:00Z',
        status: 'modified'
      },
      {
        id: '1-2',
        key: 'hero.subtitle',
        figmaText: 'The best solution for your business needs',
        savedText: 'The best solution for your business needs',
        lastSynced: '2025-11-18T10:30:00Z',
        status: 'synced'
      },
      {
        id: '1-3',
        key: 'cta.primary',
        figmaText: 'Get Started Free',
        savedText: 'Get Started',
        lastSynced: '2025-11-18T10:30:00Z',
        status: 'modified'
      },
      {
        id: '1-4',
        key: 'features.title',
        figmaText: 'Powerful Features',
        savedText: '',
        lastSynced: null,
        status: 'new'
      }
    ]
  },
  {
    id: '2',
    name: 'Pricing Page',
    path: 'pricing.json',
    lastSynced: '2025-11-17T15:20:00Z',
    copyItems: [
      {
        id: '2-1',
        key: 'pricing.title',
        figmaText: 'Simple, Transparent Pricing',
        savedText: 'Simple, Transparent Pricing',
        lastSynced: '2025-11-17T15:20:00Z',
        status: 'synced'
      },
      {
        id: '2-2',
        key: 'pricing.subtitle',
        figmaText: 'Choose the plan that works for you',
        savedText: 'Choose the right plan for your team',
        lastSynced: '2025-11-17T15:20:00Z',
        status: 'modified'
      },
      {
        id: '2-3',
        key: 'plan.starter.name',
        figmaText: 'Starter Plan',
        savedText: 'Starter',
        lastSynced: '2025-11-17T15:20:00Z',
        status: 'modified'
      }
    ]
  },
  {
    id: '3',
    name: 'About Page',
    path: 'about.json',
    lastSynced: '2025-11-16T09:15:00Z',
    copyItems: [
      {
        id: '3-1',
        key: 'about.title',
        figmaText: 'About Our Company',
        savedText: 'About Our Company',
        lastSynced: '2025-11-16T09:15:00Z',
        status: 'synced'
      },
      {
        id: '3-2',
        key: 'about.mission',
        figmaText: 'Our mission is to empower teams worldwide',
        savedText: 'Our mission is to empower teams worldwide',
        lastSynced: '2025-11-16T09:15:00Z',
        status: 'synced'
      }
    ]
  }
];

const initialGitHubConfig: GitHubConfig = {
  owner: 'your-username',
  repo: 'your-repo',
  branch: 'main',
  token: '',
  basePath: 'copy/'
};

export default function App() {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [selectedPageId, setSelectedPageId] = useState<string | null>('1');
  const [githubConfig, setGitHubConfig] = useState<GitHubConfig>(initialGitHubConfig);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId] = useState(() => {
    // Get or create user ID from localStorage
    let id = localStorage.getItem('figma-copy-plugin-user-id');
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('figma-copy-plugin-user-id', id);
    }
    return id;
  });

  const selectedPage = pages.find(p => p.id === selectedPageId);

  // Load data from Supabase on mount
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load GitHub config
      try {
        const config = await api.github.getConfig(userId);
        setGitHubConfig(config);
      } catch (error) {
        console.log('No GitHub config found, using defaults');
      }

      // Load pages
      try {
        const loadedPages = await api.github.getPages(userId);
        console.log('Pages loaded from server:', loadedPages);
        
        if (loadedPages && loadedPages.length > 0) {
          setPages(loadedPages);
          setSelectedPageId(loadedPages[0].id);
          console.log('Loaded pages from server:', loadedPages.length);
        } else {
          // Initialize with mock data
          console.log('No pages found, initializing with mock data');
          for (const page of initialPages) {
            console.log('Saving initial page:', page.id, page.name, 'with', page.copyItems.length, 'items');
            await api.github.savePage(userId, page);
          }
          setPages(initialPages);
          setSelectedPageId(initialPages[0].id);
          console.log('Initialized with', initialPages.length, 'pages');
        }
      } catch (error) {
        console.error('Error loading pages:', error);
        // Initialize with mock data on error
        console.log('Error loading pages, initializing with mock data');
        for (const page of initialPages) {
          console.log('Saving initial page after error:', page.id, page.name, 'with', page.copyItems.length, 'items');
          await api.github.savePage(userId, page);
        }
        setPages(initialPages);
        setSelectedPageId(initialPages[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncItem = async (itemId: string) => {
    if (!selectedPageId) return;
    
    // Validate GitHub config first
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      toast.error('Please configure GitHub settings first');
      return;
    }
    
    try {
      const result = await api.github.syncItem(userId, selectedPageId, itemId);
      
      // Update local state
      setPages(pages.map(p => p.id === selectedPageId ? result.page : p));
      toast.success('Copy item synced to GitHub');
    } catch (error) {
      console.error('Error syncing item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync item';
      toast.error(errorMessage);
      
      // If it's a config error, suggest opening settings
      if (errorMessage.includes('configuration')) {
        toast.error('Please check your GitHub settings');
      }
    }
  };

  const handleSyncAll = async () => {
    // Check if still loading
    if (isLoading) {
      toast.error('Please wait for pages to load');
      return;
    }

    // Check if there are any pages
    if (!pages || pages.length === 0) {
      toast.error('No pages to sync. Please create some pages first.');
      return;
    }

    // Check if any pages have copy items
    const pagesWithItems = pages.filter(p => p.copyItems && p.copyItems.length > 0);
    if (pagesWithItems.length === 0) {
      toast.error('No copy items to sync. Please add some copy items to your pages first.');
      return;
    }

    // Validate GitHub config first
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      toast.error('Please configure GitHub settings first');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('Syncing all pages. Pages with items:', pagesWithItems.length);
      const result = await api.github.syncAll(userId);
      setPages(result.pages);
      toast.success('All changes synced to GitHub');
    } catch (error) {
      console.error('Error syncing all:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync all changes';
      toast.error(errorMessage);
      
      // If it's a config error, suggest opening settings
      if (errorMessage.includes('configuration')) {
        toast.error('Please check your GitHub settings');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromGitHub = async () => {
    // Check if still loading
    if (isLoading) {
      toast.error('Please wait for pages to load');
      return;
    }

    // Check if there are any pages
    if (!pages || pages.length === 0) {
      toast.error('No pages to pull. Please create some pages first.');
      return;
    }

    // Validate GitHub config first
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      toast.error('Please configure GitHub settings first');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await api.github.pull(userId);
      setPages(result.pages);
      toast.success('Pulled latest from GitHub');
    } catch (error) {
      console.error('Error pulling from GitHub:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to pull from GitHub';
      toast.error(errorMessage);
      
      // If it's a config error, suggest opening settings
      if (errorMessage.includes('configuration')) {
        toast.error('Please check your GitHub settings');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshFromFigma = async () => {
    // In a real plugin, this would query the Figma API
    // For now, we'll just reload from Supabase
    await loadData();
    toast.success('Refreshed from Figma');
  };

  const handleSaveGitHubConfig = async (config: GitHubConfig) => {
    try {
      await api.github.saveConfig(userId, config);
      setGitHubConfig(config);
      toast.success('GitHub configuration saved');
    } catch (error) {
      console.error('Error saving GitHub config:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    }
  };

  const handleUpdateCopyItem = async (itemId: string, newText: string) => {
    if (!selectedPageId) return;

    // Update local state immediately for responsive UI
    setPages(pages.map(page => {
      if (page.id === selectedPageId) {
        return {
          ...page,
          copyItems: page.copyItems.map(item => {
            if (item.id === itemId) {
              // Determine new status based on comparison with saved text
              let newStatus: 'synced' | 'modified' | 'new' = 'synced';
              if (item.savedText === '') {
                newStatus = 'new';
              } else if (newText !== item.savedText) {
                newStatus = 'modified';
              }

              return {
                ...item,
                figmaText: newText,
                status: newStatus
              };
            }
            return item;
          })
        };
      }
      return page;
    }));

    // Save to backend
    try {
      const updatedPage = pages.find(p => p.id === selectedPageId);
      if (updatedPage) {
        const pageToSave = {
          ...updatedPage,
          copyItems: updatedPage.copyItems.map(item => {
            if (item.id === itemId) {
              let newStatus: 'synced' | 'modified' | 'new' = 'synced';
              if (item.savedText === '') {
                newStatus = 'new';
              } else if (newText !== item.savedText) {
                newStatus = 'modified';
              }

              return {
                ...item,
                figmaText: newText,
                status: newStatus
              };
            }
            return item;
          })
        };

        await api.github.savePage(userId, pageToSave);
      }
    } catch (error) {
      console.error('Error saving copy item update:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleUpdateCopyItemKey = async (itemId: string, newKey: string) => {
    if (!selectedPageId) return;

    // Update local state immediately for responsive UI
    setPages(pages.map(page => {
      if (page.id === selectedPageId) {
        return {
          ...page,
          copyItems: page.copyItems.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                key: newKey
              };
            }
            return item;
          })
        };
      }
      return page;
    }));

    // Save to backend
    try {
      const updatedPage = pages.find(p => p.id === selectedPageId);
      if (updatedPage) {
        const pageToSave = {
          ...updatedPage,
          copyItems: updatedPage.copyItems.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                key: newKey
              };
            }
            return item;
          })
        };

        await api.github.savePage(userId, pageToSave);
      }
    } catch (error) {
      console.error('Error saving copy item key update:', error);
      toast.error('Failed to save key');
    }
  };

  const handleDeleteCopyItem = async (itemId: string) => {
    if (!selectedPageId) return;

    // Update local state immediately
    setPages(pages.map(page => {
      if (page.id === selectedPageId) {
        return {
          ...page,
          copyItems: page.copyItems.filter(item => item.id !== itemId)
        };
      }
      return page;
    }));

    // Save to backend
    try {
      const updatedPage = pages.find(p => p.id === selectedPageId);
      if (updatedPage) {
        const pageToSave = {
          ...updatedPage,
          copyItems: updatedPage.copyItems.filter(item => item.id !== itemId)
        };

        await api.github.savePage(userId, pageToSave);
        toast.success('Copy item deleted');
      }
    } catch (error) {
      console.error('Error deleting copy item:', error);
      toast.error('Failed to delete item');
    }
  };

  const totalChanges = pages.reduce((acc, page) => 
    acc + page.copyItems.filter(item => item.status !== 'synced').length, 0
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toaster />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-gray-700" />
            <h1 className="text-gray-900">Copy Repository</h1>
          </div>
          <GitHubSettings config={githubConfig} onSave={handleSaveGitHubConfig} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-gray-700 mb-3">Pages</h2>
            <PageSelector
              pages={pages}
              selectedPageId={selectedPageId}
              onSelectPage={setSelectedPageId}
            />
          </div>
          
          <div className="flex-1"></div>
          
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleRefreshFromFigma}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh from Figma
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handlePullFromGitHub}
              disabled={isSyncing || isLoading || pages.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Pull from GitHub
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedPage ? (
            <>
              {/* Page Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-gray-900">{selectedPage.name}</h2>
                    <p className="text-gray-500 mt-0.5">
                      {selectedPage.copyItems.length} copy items
                      {selectedPage.lastSynced && (
                        <span className="ml-2">
                          • Last synced {new Date(selectedPage.lastSynced).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={handleSyncAll}
                    disabled={isSyncing || isLoading || totalChanges === 0 || pages.length === 0}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isSyncing ? 'Syncing...' : `Sync All${totalChanges > 0 ? ` (${totalChanges})` : ''}`}
                  </Button>
                </div>
              </div>

              {/* Copy Items */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl space-y-3">
                  {selectedPage.copyItems.map(item => (
                    <CopyItemCard
                      key={item.id}
                      item={item}
                      onSync={handleSyncItem}
                      onUpdate={handleUpdateCopyItem}
                      onUpdateKey={handleUpdateCopyItemKey}
                      onDelete={handleDeleteCopyItem}
                    />
                  ))}
                  
                  {/* Add New Item Button */}
                  <button
                    onClick={() => {
                      if (!selectedPageId) return;
                      
                      const newItem: CopyItem = {
                        id: `${selectedPageId}-${Date.now()}`,
                        key: `new.key.${Date.now()}`,
                        figmaText: '',
                        savedText: '',
                        lastSynced: null,
                        status: 'new'
                      };
                      
                      setPages(pages.map(page => {
                        if (page.id === selectedPageId) {
                          return {
                            ...page,
                            copyItems: [...page.copyItems, newItem]
                          };
                        }
                        return page;
                      }));
                      
                      // Save to backend
                      const updatedPage = pages.find(p => p.id === selectedPageId);
                      if (updatedPage) {
                        const pageToSave = {
                          ...updatedPage,
                          copyItems: [...updatedPage.copyItems, newItem]
                        };
                        api.github.savePage(userId, pageToSave).catch(error => {
                          console.error('Error saving new item:', error);
                          toast.error('Failed to save new item');
                        });
                      }
                      
                      toast.success('New copy item added');
                    }}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors text-gray-600 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Copy Item
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a page to view copy items
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
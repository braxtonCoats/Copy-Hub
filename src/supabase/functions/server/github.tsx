import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { encodeBase64, decodeBase64 } from 'jsr:@std/encoding/base64';

const app = new Hono();

interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  basePath: string;
}

interface CopyItem {
  id: string;
  key: string;
  figmaText: string;
  savedText: string;
  lastSynced: string | null;
  status: 'synced' | 'modified' | 'new';
}

interface Page {
  id: string;
  name: string;
  path: string;
  copyItems: CopyItem[];
  lastSynced: string | null;
}

// Save GitHub configuration
app.post('/config', async (c) => {
  try {
    const { userId, config } = await c.req.json() as { userId: string; config: GitHubConfig };
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    if (!config || !config.owner || !config.repo || !config.token) {
      return c.json({ error: 'Invalid GitHub configuration. Owner, repo, and token are required.' }, 400);
    }

    await kv.set(`github_config:${userId}`, config);
    console.log('GitHub config saved for user:', userId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error saving GitHub config:', error);
    return c.json({ error: 'Failed to save GitHub configuration', details: String(error) }, 500);
  }
});

// Get GitHub configuration
app.get('/config', async (c) => {
  try {
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const config = await kv.get(`github_config:${userId}`);
    
    if (!config) {
      return c.json({ error: 'GitHub configuration not found' }, 404);
    }

    return c.json(config);
  } catch (error) {
    console.error('Error getting GitHub config:', error);
    return c.json({ error: 'Failed to get GitHub configuration', details: String(error) }, 500);
  }
});

// Get all pages
app.get('/pages', async (c) => {
  try {
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const pagesData = await kv.getByPrefix(`page:${userId}:`);
    console.log('Getting pages for user:', userId, 'found:', pagesData?.length);
    
    // Filter out any undefined/null values
    const pages = pagesData
      .map((item: any) => item.value)
      .filter((page: any) => page != null);
    
    console.log('Pages retrieved:', pages.map((p: any) => ({ 
      id: p.id, 
      name: p.name, 
      copyItemsCount: p.copyItems?.length || 0 
    })));
    
    return c.json(pages);
  } catch (error) {
    console.error('Error getting pages:', error);
    return c.json({ error: 'Failed to get pages', details: String(error) }, 500);
  }
});

// Save page data
app.post('/pages', async (c) => {
  try {
    const { userId, page } = await c.req.json() as { userId: string; page: Page };
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    if (!page || !page.id) {
      return c.json({ error: 'Invalid page data' }, 400);
    }

    console.log('Saving page:', page.id, 'for user:', userId, 'with copyItems:', page.copyItems?.length || 0);

    await kv.set(`page:${userId}:${page.id}`, page);
    
    // Verify it was saved
    const saved = await kv.get(`page:${userId}:${page.id}`);
    console.log('Verified saved page:', saved ? 'exists' : 'not found');
    
    return c.json({ success: true, page });
  } catch (error) {
    console.error('Error saving page:', error);
    return c.json({ error: 'Failed to save page', details: String(error) }, 500);
  }
});

// Sync individual item to GitHub
app.post('/sync-item', async (c) => {
  try {
    const { userId, pageId, itemId } = await c.req.json() as { 
      userId: string; 
      pageId: string; 
      itemId: string; 
    };
    
    if (!userId || !pageId || !itemId) {
      return c.json({ error: 'User ID, page ID, and item ID are required' }, 400);
    }

    // Get page data
    const page = await kv.get(`page:${userId}:${pageId}`) as Page;
    if (!page) {
      return c.json({ error: 'Page not found' }, 404);
    }

    // Get GitHub config
    const config = await kv.get(`github_config:${userId}`) as GitHubConfig;
    if (!config || !config.token) {
      return c.json({ error: 'GitHub configuration not found' }, 404);
    }

    // Find the item to sync
    const itemIndex = page.copyItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return c.json({ error: 'Item not found' }, 404);
    }

    // Update the item
    const now = new Date().toISOString();
    page.copyItems[itemIndex] = {
      ...page.copyItems[itemIndex],
      savedText: page.copyItems[itemIndex].figmaText,
      lastSynced: now,
      status: 'synced'
    };
    page.lastSynced = now;

    // Convert page items to JSON format for GitHub
    const copyJson: Record<string, string> = {};
    page.copyItems.forEach(item => {
      copyJson[item.key] = item.savedText;
    });

    // Push to GitHub
    await pushToGitHub(config, page.path, copyJson);

    // Save updated page
    await kv.set(`page:${userId}:${pageId}`, page);
    
    return c.json({ success: true, page });
  } catch (error) {
    console.error('Error syncing item to GitHub:', error);
    return c.json({ error: 'Failed to sync item', details: String(error) }, 500);
  }
});

// Sync all changes to GitHub
app.post('/sync-all', async (c) => {
  try {
    const { userId } = await c.req.json() as { userId: string };
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Get GitHub config
    const config = await kv.get(`github_config:${userId}`) as GitHubConfig;
    if (!config || !config.token) {
      return c.json({ error: 'GitHub configuration not found. Please configure GitHub settings first.' }, 404);
    }

    // Get all pages
    const pagesData = await kv.getByPrefix(`page:${userId}:`);
    console.log('Sync-all: Pages data from KV:', pagesData?.length || 0, 'items');
    
    if (!pagesData || pagesData.length === 0) {
      return c.json({ error: 'No pages found. Please create some pages first.' }, 404);
    }

    // Filter out any undefined/null values and ensure proper structure
    const pages = pagesData
      .map((item: any) => {
        const page = item?.value;
        if (!page) {
          console.log('Sync-all: Null/undefined page found');
          return null;
        }
        if (!page.copyItems) {
          console.log('Sync-all: Page missing copyItems:', page.id, page.name);
          return null;
        }
        if (!Array.isArray(page.copyItems)) {
          console.log('Sync-all: Page copyItems is not an array:', page.id, page.name);
          return null;
        }
        if (page.copyItems.length === 0) {
          console.log('Sync-all: Page has empty copyItems:', page.id, page.name);
          return null;
        }
        return page;
      })
      .filter((page: any) => page != null) as Page[];

    console.log('Sync-all: Valid pages count:', pages.length, 'Total pages:', pagesData.length);

    if (pages.length === 0) {
      return c.json({ 
        error: 'No valid pages with copy items found. Please ensure your pages have copy items.',
        details: 'All pages are either missing copyItems arrays or have empty copyItems arrays.'
      }, 400);
    }

    const now = new Date().toISOString();

    // Sync each page
    for (const page of pages) {
      console.log('Sync-all: Processing page:', page.id, page.name, 'with', page.copyItems.length, 'items');
      
      // Update all items to synced
      page.copyItems = page.copyItems.map(item => ({
        ...item,
        savedText: item.figmaText,
        lastSynced: now,
        status: 'synced' as const
      }));
      page.lastSynced = now;

      // Convert to JSON format
      const copyJson: Record<string, string> = {};
      page.copyItems.forEach(item => {
        copyJson[item.key] = item.savedText;
      });

      console.log('Sync-all: Pushing to GitHub:', page.path);
      
      // Push to GitHub
      await pushToGitHub(config, page.path, copyJson);

      // Save updated page
      await kv.set(`page:${userId}:${page.id}`, page);
    }
    
    return c.json({ success: true, pages });
  } catch (error) {
    console.error('Error syncing all to GitHub:', error);
    return c.json({ error: 'Failed to sync all changes', details: String(error) }, 500);
  }
});

// Pull from GitHub
app.post('/pull', async (c) => {
  try {
    const { userId, pageId } = await c.req.json() as { userId: string; pageId?: string };
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Get GitHub config
    const config = await kv.get(`github_config:${userId}`) as GitHubConfig;
    if (!config || !config.token) {
      return c.json({ error: 'GitHub configuration not found' }, 404);
    }

    if (pageId) {
      // Pull specific page
      const page = await kv.get(`page:${userId}:${pageId}`) as Page;
      if (!page) {
        return c.json({ error: 'Page not found' }, 404);
      }

      const githubContent = await pullFromGitHub(config, page.path);
      
      // Update page items with GitHub content
      page.copyItems = page.copyItems.map(item => ({
        ...item,
        savedText: githubContent[item.key] || item.savedText,
        status: (githubContent[item.key] && githubContent[item.key] !== item.figmaText) ? 'modified' as const : 'synced' as const
      }));

      await kv.set(`page:${userId}:${pageId}`, page);
      
      return c.json({ success: true, page });
    } else {
      // Pull all pages
      const pagesData = await kv.getByPrefix(`page:${userId}:`);
      
      if (!pagesData || pagesData.length === 0) {
        return c.json({ error: 'No pages found' }, 404);
      }

      // Filter out any undefined/null values
      const pages = pagesData
        .map((item: any) => item.value)
        .filter((page: any) => page && page.copyItems && Array.isArray(page.copyItems)) as Page[];

      if (pages.length === 0) {
        return c.json({ error: 'No valid pages found' }, 404);
      }

      for (const page of pages) {
        const githubContent = await pullFromGitHub(config, page.path);
        
        page.copyItems = page.copyItems.map(item => ({
          ...item,
          savedText: githubContent[item.key] || item.savedText,
          status: (githubContent[item.key] && githubContent[item.key] !== item.figmaText) ? 'modified' as const : 'synced' as const
        }));

        await kv.set(`page:${userId}:${page.id}`, page);
      }
      
      return c.json({ success: true, pages });
    }
  } catch (error) {
    console.error('Error pulling from GitHub:', error);
    return c.json({ error: 'Failed to pull from GitHub', details: String(error) }, 500);
  }
});

// Helper function to push to GitHub
async function pushToGitHub(config: GitHubConfig, filePath: string, content: Record<string, string>) {
  const fullPath = `${config.basePath}${filePath}`;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${fullPath}`;
  
  // First, get the file to get its SHA (required for updates)
  let sha: string | undefined;
  try {
    const getResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Figma-Copy-Plugin'
      }
    });
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      sha = data.sha;
    }
  } catch (error) {
    console.log('File does not exist yet, will create new file');
  }

  // Create or update the file
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(JSON.stringify(content, null, 2));
  const contentBase64 = encodeBase64(contentBytes);
  
  const body: any = {
    message: `Update ${filePath} from Figma plugin`,
    content: contentBase64,
    branch: config.branch
  };
  
  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Figma-Copy-Plugin'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return await response.json();
}

// Helper function to pull from GitHub
async function pullFromGitHub(config: GitHubConfig, filePath: string): Promise<Record<string, string>> {
  const fullPath = `${config.basePath}${filePath}`;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${fullPath}?ref=${config.branch}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Figma-Copy-Plugin'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return {}; // File doesn't exist yet
    }
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const contentBytes = decodeBase64(data.content.replace(/\s/g, ''));
  const decoder = new TextDecoder();
  const content = decoder.decode(contentBytes);
  
  return JSON.parse(content);
}

export default app;
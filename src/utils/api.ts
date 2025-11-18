import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7649372d`;

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  details?: string;
  data?: T;
}

async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  github: {
    saveConfig: (userId: string, config: any) =>
      apiFetch('/github/config', {
        method: 'POST',
        body: JSON.stringify({ userId, config }),
      }),
    
    getConfig: (userId: string) =>
      apiFetch(`/github/config?userId=${userId}`),
    
    getPages: (userId: string) =>
      apiFetch(`/github/pages?userId=${userId}`),
    
    savePage: (userId: string, page: any) =>
      apiFetch('/github/pages', {
        method: 'POST',
        body: JSON.stringify({ userId, page }),
      }),
    
    syncItem: (userId: string, pageId: string, itemId: string) =>
      apiFetch('/github/sync-item', {
        method: 'POST',
        body: JSON.stringify({ userId, pageId, itemId }),
      }),
    
    syncAll: (userId: string) =>
      apiFetch('/github/sync-all', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    
    pull: (userId: string, pageId?: string) =>
      apiFetch('/github/pull', {
        method: 'POST',
        body: JSON.stringify({ userId, pageId }),
      }),
  },
};

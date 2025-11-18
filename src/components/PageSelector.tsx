import React from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Page } from '../types';
import { Badge } from './ui/badge';

interface PageSelectorProps {
  pages: Page[];
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
}

export function PageSelector({ pages, selectedPageId, onSelectPage }: PageSelectorProps) {
  const getPageStats = (page: Page) => {
    const total = page.copyItems.length;
    const modified = page.copyItems.filter(item => item.status !== 'synced').length;
    return { total, modified };
  };

  return (
    <div className="space-y-1">
      {pages.map(page => {
        const stats = getPageStats(page);
        const isSelected = page.id === selectedPageId;

        return (
          <button
            key={page.id}
            onClick={() => onSelectPage(page.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
              isSelected
                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                : 'hover:bg-gray-100 text-gray-700 border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isSelected ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{page.name}</div>
                  <div className={`text-xs mt-0.5 ${
                    isSelected ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {stats.total} items
                  </div>
                </div>
              </div>
              {stats.modified > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex-shrink-0">
                  {stats.modified}
                </Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

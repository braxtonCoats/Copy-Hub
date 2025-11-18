import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { CopyItem } from '../types';
import { DiffViewer } from './DiffViewer';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';

interface CopyItemCardProps {
  item: CopyItem;
  onSync: (itemId: string) => void;
  onUpdate: (itemId: string, newText: string) => void;
  onUpdateKey?: (itemId: string, newKey: string) => void;
  onDelete?: (itemId: string) => void;
}

export function CopyItemCard({ item, onSync, onUpdate, onUpdateKey, onDelete }: CopyItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = item.status !== 'synced';

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(item.id, e.target.value);
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUpdateKey) {
      onUpdateKey(item.id, e.target.value);
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'synced':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />
            Synced
          </Badge>
        );
      case 'modified':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Modified
          </Badge>
        );
      case 'new':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Plus className="w-3 h-3 mr-1" />
            New
          </Badge>
        );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 break-words">{item.key}</div>
              {!expanded && (
                <div className="text-gray-500 truncate mt-1">
                  {item.figmaText || <span className="italic">Empty - click to edit</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-gray-700 mb-2 block">Copy Key</label>
                <Input
                  value={item.key}
                  onChange={handleKeyChange}
                  className="bg-white font-mono"
                  placeholder="e.g., hero.title"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div>
                <label className="text-gray-700 mb-2 block">Current Text (Editable)</label>
                <Textarea
                  value={item.figmaText}
                  onChange={handleTextChange}
                  className="min-h-[80px] bg-white"
                  placeholder="Enter copy text..."
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {hasChanges && (
                <>
                  <div className="text-gray-600 mt-3">Saved in GitHub:</div>
                  <DiffViewer original={item.savedText} modified={item.figmaText} />
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-gray-500">
                {item.lastSynced ? (
                  <span>Last synced: {new Date(item.lastSynced).toLocaleString()}</span>
                ) : (
                  <span>Not synced yet</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this copy item?')) {
                        onDelete(item.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                {hasChanges && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSync(item.id);
                    }}
                  >
                    Sync to GitHub
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

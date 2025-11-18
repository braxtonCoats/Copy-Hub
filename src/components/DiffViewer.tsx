import React from 'react';

interface DiffViewerProps {
  original: string;
  modified: string;
}

export function DiffViewer({ original, modified }: DiffViewerProps) {
  // Simple word-based diff
  const getDiff = () => {
    if (original === modified) {
      return <span className="text-gray-600">{original}</span>;
    }

    const originalWords = original.split(' ');
    const modifiedWords = modified.split(' ');

    return (
      <div className="space-y-3">
        {original && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-700 px-2 py-0.5 bg-red-100 rounded">Saved</span>
            </div>
            <p className="text-red-800">{original}</p>
          </div>
        )}
        {modified && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-700 px-2 py-0.5 bg-green-100 rounded">Figma</span>
            </div>
            <p className="text-green-800">{modified}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="text-sm">
      {getDiff()}
    </div>
  );
}

import React, { useState } from 'react';
import { Settings, Github, Check, X, ExternalLink, Info } from 'lucide-react';
import { GitHubConfig } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';

interface GitHubSettingsProps {
  config: GitHubConfig;
  onSave: (config: GitHubConfig) => void;
}

export function GitHubSettings({ config, onSave }: GitHubSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onSave(localConfig);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          GitHub Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your GitHub repository settings for syncing copy content.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <div className="space-y-2">
              <p><strong>Need help?</strong> Follow these steps:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Enter your GitHub username (owner)</li>
                <li>Enter the repository name</li>
                <li>Specify the branch (usually "main" or "master")</li>
                <li>Set a folder path where copy files will be stored</li>
                <li>Create a Personal Access Token with <code className="bg-blue-100 px-1 rounded">repo</code> scope</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="owner">Repository Owner (Your GitHub Username)</Label>
            <Input
              id="owner"
              value={localConfig.owner}
              onChange={(e) => setLocalConfig({ ...localConfig, owner: e.target.value })}
              placeholder="e.g., octocat"
            />
            <p className="text-gray-500">Your GitHub username or organization name</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="repo">Repository Name</Label>
            <Input
              id="repo"
              value={localConfig.repo}
              onChange={(e) => setLocalConfig({ ...localConfig, repo: e.target.value })}
              placeholder="e.g., my-website"
            />
            <p className="text-gray-500">The name of your GitHub repository</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              value={localConfig.branch}
              onChange={(e) => setLocalConfig({ ...localConfig, branch: e.target.value })}
              placeholder="main"
            />
            <p className="text-gray-500">Usually "main" or "master"</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="basePath">Base Path (Folder in Repository)</Label>
            <Input
              id="basePath"
              value={localConfig.basePath}
              onChange={(e) => setLocalConfig({ ...localConfig, basePath: e.target.value })}
              placeholder="copy/"
            />
            <p className="text-gray-500">Path where copy JSON files will be stored (e.g., "copy/" or "content/i18n/")</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="token">GitHub Personal Access Token</Label>
            <Input
              id="token"
              type="password"
              value={localConfig.token}
              onChange={(e) => setLocalConfig({ ...localConfig, token: e.target.value })}
              placeholder="ghp_xxxxxxxxxxxx"
            />
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
              <p className="text-yellow-900"><strong>How to create a token:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-yellow-900 ml-2">
                <li>Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
                <li>Click "Generate new token (classic)"</li>
                <li>Give it a name like "Copy Repository Plugin"</li>
                <li>Select the <code className="bg-yellow-100 px-1 rounded">repo</code> scope (full control of private repositories)</li>
                <li>Click "Generate token" and copy it here</li>
              </ol>
              <a 
                href="https://github.com/settings/tokens/new?scopes=repo&description=Copy%20Repository%20Plugin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline mt-2"
              >
                <ExternalLink className="w-4 h-4" />
                Create Token on GitHub
              </a>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

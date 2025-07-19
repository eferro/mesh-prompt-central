import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Key, Copy, Trash2, AlertTriangle, Info, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ApiKey, OrganizationMember } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface ContextType {
  user: any;
  userMemberships: OrganizationMember[];
  currentOrgId: string;
  refreshMemberships: () => void;
}

const ApiKeys = () => {
  const { user, userMemberships } = useOutletContext<ContextType>();
  const [apiKeys, setApiKeys] = useState<(ApiKey & { key?: string })[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadApiKeys();
  }, [user]);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading API keys",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateApiKey = () => {
    const prefix = 'pm';
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const key = prefix + '_' + Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return key;
  };

  const hashApiKey = async (key: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const apiKey = generateApiKey();
      const keyHash = await hashApiKey(apiKey);
      const keyPrefix = apiKey.substring(0, 8);

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          organization_id: selectedOrgId,
          name: newKeyName,
          key_hash: keyHash,
          key_prefix: keyPrefix,
        })
        .select(`
          *,
          organization:organizations(*)
        `)
        .single();

      if (error) throw error;

      // Add the full key to show once
      const newKeyWithKey = { ...data, key: apiKey };
      setApiKeys(prev => [newKeyWithKey, ...prev]);

      toast({
        title: "API key created",
        description: "Your API key has been created successfully. Make sure to copy it now!",
      });

      setIsCreateDialogOpen(false);
      setNewKeyName('');
      setSelectedOrgId('');
    } catch (error: any) {
      toast({
        title: "Error creating API key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId);

      if (error) throw error;

      setApiKeys(prev => prev.filter(key => key.id !== keyId));

      toast({
        title: "API key revoked",
        description: "The API key has been revoked and can no longer be used.",
      });
    } catch (error: any) {
      toast({
        title: "Error revoking API key",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for MCP integration
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={userMemberships.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for MCP client integration.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createApiKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="Enter a descriptive name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {userMemberships.map((membership) => (
                      <SelectItem key={membership.organization_id} value={membership.organization_id}>
                        {membership.organization?.name} ({membership.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  API keys provide access to your organization's prompts via the MCP protocol. Keep them secure!
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  Create Key
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {userMemberships.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Organizations</CardTitle>
            <CardDescription>
              You need to be a member of an organization to create API keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/organizations">
                <Users className="mr-2 h-4 w-4" />
                Manage Organizations
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No API Keys</CardTitle>
            <CardDescription>
              Create your first API key to start using MCP integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{key.name}</CardTitle>
                    <CardDescription>
                      {key.organization?.name} • Created {new Date(key.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                      {key.key || `${key.key_prefix}...`}
                    </code>
                    {key.key && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(key.key!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {key.key && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This is the only time you'll see this key. Make sure to copy and store it securely!
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {key.last_used_at ? (
                        `Last used: ${new Date(key.last_used_at).toLocaleDateString()}`
                      ) : (
                        'Never used'
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeApiKey(key.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MCP Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Integration</CardTitle>
          <CardDescription>
            How to use your API keys with Model Context Protocol clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">MCP Server Endpoints</h4>
              <div className="space-y-2">
                <code className="block p-2 bg-muted rounded text-sm">
                  POST https://axeuvumvofclazxcmmri.supabase.co/functions/v1/mcp
                </code>
                <code className="block p-2 bg-muted rounded text-sm">
                  GET https://axeuvumvofclazxcmmri.supabase.co/functions/v1/mcp/stream
                </code>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Authentication</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Include your API key in the Authorization header:
              </p>
              <code className="block p-2 bg-muted rounded text-sm">
                Authorization: Bearer your_api_key_here
              </code>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Supported Methods</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>list_prompts</code> - List all prompts in your organization</li>
                <li>• <code>get_prompt</code> - Get a specific prompt by name</li>
                <li>• <code>search_prompts</code> - Search prompts (tool)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeys;
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Key, Plus, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Prompt, ApiKey } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface ContextType {
  user: any;
  userMemberships: any[];
  currentOrgId: string;
  refreshMemberships: () => void;
}

const Dashboard = () => {
  const { user, userMemberships, currentOrgId } = useOutletContext<ContextType>();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const currentMembership = userMemberships.find(m => m.organization_id === currentOrgId);
  const currentOrg = currentMembership?.organization;

  useEffect(() => {
    if (currentOrgId) {
      loadDashboardData();
    }
  }, [currentOrgId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load prompts for current organization
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('organization_id', currentOrgId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (promptsError) throw promptsError;

      // Load API keys for current user and organization
      const { data: keysData, error: keysError } = await supabase
        .from('api_keys')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', user.id)
        .eq('organization_id', currentOrgId)
        .is('revoked_at', null);

      if (keysError) throw keysError;

      setPrompts(promptsData || []);
      setApiKeys(keysData || []);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentOrgId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to PromptMesh</h1>
          <p className="text-muted-foreground">
            You're not a member of any organizations yet. Create one to get started.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Create your first organization to start managing AI prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/organizations">
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {currentOrg?.name || 'Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          Overview of your prompt management activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prompts.length}</div>
            <p className="text-xs text-muted-foreground">
              In {currentOrg?.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <p className="text-xs text-muted-foreground">
              Your keys for this org
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{currentMembership?.role}</div>
            <p className="text-xs text-muted-foreground">
              In {currentOrg?.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MCP Compatible</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">✓</div>
            <p className="text-xs text-muted-foreground">
              Streamable HTTP + SSE
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Prompts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Prompts</CardTitle>
            <CardDescription>
              Latest prompts in your organization
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <a href="/prompts">
              View All
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-4" />
              <p>No prompts created yet</p>
              <Button asChild className="mt-4">
                <a href="/prompts">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Prompt
                </a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {prompts.map((prompt) => (
                <div key={prompt.id} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-1">
                    <h4 className="font-medium">{prompt.name}</h4>
                    <p className="text-sm text-muted-foreground">{prompt.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Updated {new Date(prompt.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/prompts/${prompt.id}`}>View</a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Your API keys for MCP integration
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <a href="/api-keys">
              Manage Keys
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="mx-auto h-12 w-12 mb-4" />
              <p>No API keys created yet</p>
              <Button asChild className="mt-4">
                <a href="/api-keys">
                  <Plus className="mr-2 h-4 w-4" />
                  Create API Key
                </a>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{key.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {key.key_prefix}...
                    </div>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
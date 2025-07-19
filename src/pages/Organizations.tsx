import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Settings, Crown, Shield, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Organization, OrganizationMember } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface ContextType {
  user: any;
  userMemberships: OrganizationMember[];
  currentOrgId: string;
  refreshMemberships: () => void;
}

const Organizations = () => {
  const { user, userMemberships, refreshMemberships } = useOutletContext<ContextType>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: newOrgName })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      toast({
        title: "Organization created",
        description: `${newOrgName} has been created successfully.`,
      });

      setIsCreateDialogOpen(false);
      setNewOrgName('');
      refreshMemberships();
    } catch (error: any) {
      toast({
        title: "Error creating organization",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'viewer':
        return <Eye className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organization memberships and settings
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Create a new organization to manage prompts and team members.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createOrganization} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Enter organization name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  Create
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
              You're not a member of any organizations yet. Create one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userMemberships.map((membership) => (
            <Card key={membership.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{membership.organization?.name}</CardTitle>
                  <Badge variant={getRoleColor(membership.role) as any} className="flex items-center gap-1">
                    {getRoleIcon(membership.role)}
                    {membership.role}
                  </Badge>
                </div>
                <CardDescription>
                  Member since {new Date(membership.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Organization ID: {membership.organization_id.slice(0, 8)}...
                  </div>
                  {membership.role === 'owner' && (
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Manage
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Organization Roles Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Roles</CardTitle>
          <CardDescription>
            Understanding the different roles in PromptMesh organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <h4 className="font-medium">Owner</h4>
                <p className="text-sm text-muted-foreground">
                  Full access to manage organization settings, members, and all prompts. Can delete the organization.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <h4 className="font-medium">Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Can create, edit, and delete prompts and their variants. Can manage prompt arguments.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <h4 className="font-medium">Viewer</h4>
                <p className="text-sm text-muted-foreground">
                  Can view and copy prompts but cannot create, edit, or delete them.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Organizations;
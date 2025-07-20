import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MessageSquare, Edit, Trash2, Eye, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Prompt, PromptVariant, PromptArgument, OrganizationMember } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface ContextType {
  user: any;
  userMemberships: OrganizationMember[];
  currentOrgId: string;
  refreshMemberships: () => void;
}

const Prompts = () => {
  const { user, userMemberships, currentOrgId } = useOutletContext<ContextType>();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [variants, setVariants] = useState<PromptVariant[]>([]);
  const [promptArguments, setPromptArguments] = useState<PromptArgument[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const currentMembership = userMemberships.find(m => m.organization_id === currentOrgId);
  const canEdit = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';

  useEffect(() => {
    if (currentOrgId) {
      loadPrompts();
    }
  }, [currentOrgId]);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          *
        `)
        .eq('organization_id', currentOrgId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading prompts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadPromptDetails = async (promptId: string) => {
    try {
      // Load variants
      const { data: variantsData, error: variantsError } = await supabase
        .from('prompt_variants')
        .select(`
          *
        `)
        .eq('prompt_id', promptId)
        .order('created_at', { ascending: false });

      if (variantsError) throw variantsError;

      // Load arguments
      const { data: argsData, error: argsError } = await supabase
        .from('prompt_arguments')
        .select('*')
        .eq('prompt_id', promptId)
        .order('name');

      if (argsError) throw argsError;

      setVariants(variantsData || []);
      setPromptArguments(argsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading prompt details",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          name: newPromptName,
          description: newPromptDescription,
          organization_id: currentOrgId,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Prompt created",
        description: `${newPromptName} has been created successfully.`,
      });

      setIsCreateDialogOpen(false);
      setNewPromptName('');
      setNewPromptDescription('');
      loadPrompts();
    } catch (error: any) {
      toast({
        title: "Error creating prompt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    loadPromptDetails(prompt.id);
  };

  if (!currentOrgId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
          <p className="text-muted-foreground">
            You need to select an organization to manage prompts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
          <p className="text-muted-foreground">
            Manage your organization's AI prompts and variants
          </p>
        </div>
        
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Prompt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Prompt</DialogTitle>
                <DialogDescription>
                  Create a new prompt template for your organization.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createPrompt} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt-name">Prompt Name</Label>
                  <Input
                    id="prompt-name"
                    placeholder="Enter prompt name"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-description">Description</Label>
                  <Textarea
                    id="prompt-description"
                    placeholder="Describe what this prompt does"
                    value={newPromptDescription}
                    onChange={(e) => setNewPromptDescription(e.target.value)}
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
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Prompts List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>All Prompts</CardTitle>
              <CardDescription>
                {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} in organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="mx-auto h-12 w-12 mb-4" />
                  <p>No prompts created yet</p>
                  {canEdit && (
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Prompt
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedPrompt?.id === prompt.id ? 'border-primary bg-muted/50' : ''
                      }`}
                      onClick={() => selectPrompt(prompt)}
                    >
                      <div className="font-medium">{prompt.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {prompt.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(prompt.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Prompt Details */}
        <div className="lg:col-span-2">
          {selectedPrompt ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedPrompt.name}</CardTitle>
                      <CardDescription>{selectedPrompt.description}</CardDescription>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>

              <Tabs defaultValue="variants" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="variants">Variants ({variants.length})</TabsTrigger>
                  <TabsTrigger value="arguments">Arguments ({promptArguments.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="variants">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Prompt Variants</CardTitle>
                        <CardDescription>
                          Different versions of this prompt
                        </CardDescription>
                      </div>
                      {canEdit && (
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Variant
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {variants.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="mx-auto h-8 w-8 mb-4" />
                          <p>No variants created yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {variants.map((variant) => (
                            <div key={variant.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    Version {new Date(variant.created_at).toLocaleDateString()}
                                  </span>
                                  {variant.is_default && (
                                    <Badge variant="default">Default</Badge>
                                  )}
                                </div>
                                {canEdit && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <pre className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                                {variant.content}
                              </pre>
                              {variant.notes && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  Notes: {variant.notes}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-2">
                                {new Date(variant.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="arguments">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Prompt Arguments</CardTitle>
                        <CardDescription>
                          Parameters for this prompt template
                        </CardDescription>
                      </div>
                      {canEdit && (
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Argument
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {promptArguments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Settings className="mx-auto h-8 w-8 mb-4" />
                          <p>No arguments defined yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {promptArguments.map((arg) => (
                            <div key={arg.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{arg.name}</span>
                                    {arg.required && (
                                      <Badge variant="destructive" className="text-xs">Required</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {arg.description}
                                  </p>
                                </div>
                                {canEdit && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <Eye className="mx-auto h-12 w-12 mb-4" />
                  <p>Select a prompt to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prompts;
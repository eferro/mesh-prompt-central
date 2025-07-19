import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import { OrganizationMember } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AppLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userMemberships, setUserMemberships] = useState<OrganizationMember[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadUserMemberships();
    }
  }, [user]);

  const loadUserMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      setUserMemberships(data || []);
      
      // Set first organization as current if none selected
      if (data && data.length > 0 && !currentOrgId) {
        setCurrentOrgId(data[0].organization_id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading organizations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          userMemberships={userMemberships}
          currentOrgId={currentOrgId}
          onOrgChange={setCurrentOrgId}
        />
        
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-6">
            <SidebarTrigger />
          </header>
          
          <div className="flex-1 p-6">
            <Outlet context={{ user, userMemberships, currentOrgId, refreshMemberships: loadUserMemberships }} />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
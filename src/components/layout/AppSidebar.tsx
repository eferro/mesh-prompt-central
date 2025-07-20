import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Network, Home, MessageSquare, Users, Key, Settings, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OrganizationMember } from '@/types/database';

interface AppSidebarProps {
  userMemberships: OrganizationMember[];
  currentOrgId?: string;
  onOrgChange: (orgId: string) => void;
}

const AppSidebar = ({ userMemberships, currentOrgId, onOrgChange }: AppSidebarProps) => {
  const { state } = useSidebar();
  const location = useLocation();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => currentPath === path;

  const currentMembership = userMemberships.find(m => m.organization_id === currentOrgId);
  const canManagePrompts = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';

  const mainItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Prompts", url: "/prompts", icon: MessageSquare },
    { title: "Organizations", url: "/organizations", icon: Users },
    { title: "API Keys", url: "/api-keys", icon: Key },
  ];

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-primary p-2 rounded-md">
            <Network className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">PromptMesh</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userMemberships.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Organizations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userMemberships.map((membership) => (
                  <SidebarMenuItem key={membership.organization_id}>
                    <SidebarMenuButton
                      onClick={() => onOrgChange(membership.organization_id)}
                      isActive={currentOrgId === membership.organization_id}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {!collapsed && (
                          <div className="flex-1 text-left">
                            <div className="font-medium truncate">
                              {membership.organization?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {membership.role}
                            </div>
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="justify-start"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
export type OrganizationRole = 'owner' | 'admin' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
  organization?: Organization;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  creator_id: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  creator?: Profile;
}

export interface PromptVariant {
  id: string;
  prompt_id: string;
  content: string;
  notes: string | null;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface PromptArgument {
  id: string;
  prompt_id: string;
  name: string;
  description: string | null;
  required: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  organization?: Organization;
}
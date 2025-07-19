-- Create enum for organization roles
CREATE TYPE public.organization_role AS ENUM ('owner', 'admin', 'viewer');

-- Organizations table
CREATE TABLE public.organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Organization members table
CREATE TABLE public.organization_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role organization_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- Prompts table
CREATE TABLE public.prompts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- Prompt variants table
CREATE TABLE public.prompt_variants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    notes TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Prompt arguments table
CREATE TABLE public.prompt_arguments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(prompt_id, name)
);

-- API keys table
CREATE TABLE public.api_keys (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- User profiles table for additional user data
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they are members of" 
ON public.organizations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create organizations" 
ON public.organizations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Organization owners can update" 
ON public.organizations FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid() 
        AND role = 'owner'
    )
);

-- RLS Policies for organization_members
CREATE POLICY "Users can view organization members for their orgs" 
ON public.organization_members FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om 
        WHERE om.organization_id = organization_members.organization_id 
        AND om.user_id = auth.uid()
    )
);

CREATE POLICY "Organization owners can manage members" 
ON public.organization_members FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = organization_members.organization_id 
        AND user_id = auth.uid() 
        AND role = 'owner'
    )
);

-- RLS Policies for prompts
CREATE POLICY "Organization members can view prompts" 
ON public.prompts FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = prompts.organization_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Admins and owners can manage prompts" 
ON public.prompts FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = prompts.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
);

-- RLS Policies for prompt_variants
CREATE POLICY "Organization members can view prompt variants" 
ON public.prompt_variants FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.prompts p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = prompt_variants.prompt_id 
        AND om.user_id = auth.uid()
    )
);

CREATE POLICY "Admins and owners can manage prompt variants" 
ON public.prompt_variants FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.prompts p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = prompt_variants.prompt_id 
        AND om.user_id = auth.uid() 
        AND om.role IN ('owner', 'admin')
    )
);

-- RLS Policies for prompt_arguments
CREATE POLICY "Organization members can view prompt arguments" 
ON public.prompt_arguments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.prompts p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = prompt_arguments.prompt_id 
        AND om.user_id = auth.uid()
    )
);

CREATE POLICY "Admins and owners can manage prompt arguments" 
ON public.prompt_arguments FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.prompts p
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = prompt_arguments.prompt_id 
        AND om.user_id = auth.uid() 
        AND om.role IN ('owner', 'admin')
    )
);

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys" 
ON public.api_keys FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create API keys for their orgs" 
ON public.api_keys FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = api_keys.organization_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own API keys" 
ON public.api_keys FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompt_variants_updated_at
    BEFORE UPDATE ON public.prompt_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
    RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to ensure only one default variant per prompt
CREATE OR REPLACE FUNCTION public.ensure_single_default_variant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.prompt_variants 
        SET is_default = false 
        WHERE prompt_id = NEW.prompt_id 
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one default variant
CREATE TRIGGER ensure_single_default_variant_trigger
    AFTER INSERT OR UPDATE ON public.prompt_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_single_default_variant();
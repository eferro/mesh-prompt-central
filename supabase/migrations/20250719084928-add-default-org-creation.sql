-- Update the handle_new_user function to create a default organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Create user profile
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
    
    -- Create a default organization for the user
    INSERT INTO public.organizations (name, created_at, updated_at)
    VALUES (
        COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'User') || '''s Organization',
        now(),
        now()
    )
    RETURNING id INTO org_id;
    
    -- Add the user as owner of their default organization
    INSERT INTO public.organization_members (organization_id, user_id, role, created_at)
    VALUES (org_id, NEW.id, 'owner', now());
    
    RETURN NEW;
END;
$$; 
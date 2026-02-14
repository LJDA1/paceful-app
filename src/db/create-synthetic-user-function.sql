-- ============================================================================
-- Create Synthetic User Function (Minimal - No Login Needed)
-- Just creates the auth.users row to satisfy FK constraint
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS create_synthetic_auth_user(uuid, text);
DROP FUNCTION IF EXISTS create_synthetic_user(text, text, text, jsonb);
DROP FUNCTION IF EXISTS delete_synthetic_user(uuid);

-- Create minimal auth user (just satisfies FK constraint, no password needed)
CREATE OR REPLACE FUNCTION create_synthetic_auth_user(
    p_user_id uuid,
    p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud,
        confirmation_token,
        recovery_token
    ) VALUES (
        p_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        'SYNTHETIC_NO_LOGIN',  -- Not a valid hash, can't login
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"], "is_synthetic": true}'::jsonb,
        '{"is_synthetic": true}'::jsonb,
        FALSE,
        'authenticated',
        'authenticated',
        '',
        ''
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_synthetic_auth_user TO service_role;

-- Delete synthetic user (for cleanup)
CREATE OR REPLACE FUNCTION delete_synthetic_auth_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_synthetic_auth_user TO service_role;

-- Delete ALL synthetic auth users (by email pattern)
CREATE OR REPLACE FUNCTION delete_all_synthetic_auth_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM auth.users
    WHERE email LIKE '%@paceful.synthetic'
    OR raw_user_meta_data->>'is_synthetic' = 'true';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_all_synthetic_auth_users TO service_role;

-- Verify
SELECT 'All synthetic user functions created' as status;

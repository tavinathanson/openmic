-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_comedian_signup_count;

-- Create updated function that excludes waitlist signups
CREATE OR REPLACE FUNCTION public.get_comedian_signup_count(p_date_id UUID)
  RETURNS BIGINT
  LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COUNT(*)::bigint
      FROM public.sign_ups
     WHERE signup_type = 'comedian'
       AND open_mic_date_id = p_date_id
       AND (is_waitlist IS NULL OR is_waitlist = false);
$$;

-- Grant execute so anonymous users can call this RPC
GRANT EXECUTE ON FUNCTION public.get_comedian_signup_count(UUID) TO anon; 
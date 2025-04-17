-- Create a view for comedian sign-ups
CREATE OR REPLACE VIEW comedian_signups with (security_invoker = on) AS
SELECT 
    p.email,
    p.full_name,
    s.first_mic_ever,
    s.created_at as signup_date
FROM 
    sign_ups s
JOIN 
    people p ON s.person_id = p.id
WHERE 
    s.signup_type = 'comedian'
ORDER BY 
    s.created_at ASC;

-- Add comment to explain the view
COMMENT ON VIEW comedian_signups IS 'Shows comedian sign-ups with their email, name, first mic status, and signup date, ordered by signup date (oldest to newest)'; 
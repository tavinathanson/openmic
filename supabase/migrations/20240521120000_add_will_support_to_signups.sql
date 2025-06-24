ALTER TABLE public.sign_ups
ADD COLUMN will_support BOOLEAN DEFAULT FALSE NOT NULL;
 
COMMENT ON COLUMN public.sign_ups.will_support IS 'Indicates if the user has pledged to make a purchase to support the venue.'; 
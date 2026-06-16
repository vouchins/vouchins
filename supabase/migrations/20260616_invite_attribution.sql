ALTER TABLE public.users 
ADD COLUMN invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

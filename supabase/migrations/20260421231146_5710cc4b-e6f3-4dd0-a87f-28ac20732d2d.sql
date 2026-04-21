DROP POLICY IF EXISTS "Admins can manage app config" ON public.app_config;

CREATE POLICY "Admins can insert app config"
ON public.app_config
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app config"
ON public.app_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app config"
ON public.app_config
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
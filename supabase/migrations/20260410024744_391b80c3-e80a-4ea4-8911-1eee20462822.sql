UPDATE public.user_settings 
SET wordpress_app_password = NULL 
WHERE user_id = '1c45fe95-636f-4118-a4b6-1f36e2c69c8e' 
AND wordpress_app_password IS NOT NULL;
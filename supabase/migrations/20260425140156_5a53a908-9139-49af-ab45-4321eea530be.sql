-- Add columns for Azure OpenAI (Copilot) configuration
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS azure_openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS azure_openai_endpoint TEXT,
ADD COLUMN IF NOT EXISTS azure_openai_deployment_name TEXT;

COMMENT ON COLUMN public.user_settings.azure_openai_api_key IS 'API Key for Azure OpenAI (Copilot redundancy)';
COMMENT ON COLUMN public.user_settings.azure_openai_endpoint IS 'Endpoint URL for Azure OpenAI';
COMMENT ON COLUMN public.user_settings.azure_openai_deployment_name IS 'Deployment name (model) for Azure OpenAI';
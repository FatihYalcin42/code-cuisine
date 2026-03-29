declare global {
  interface Window {
    __CODE_CUISINE_API__?: Partial<ApiRuntimeConfig>;
  }
}

export interface ApiRuntimeConfig {
  recipeWebhookUrl: string;
}

const DEFAULT_API_CONFIG: ApiRuntimeConfig = {
  recipeWebhookUrl: '/api/generate-recipe-v2',
};

/** Reads runtime API endpoints injected from `public/api-config.js`. */
export function getApiConfig(): ApiRuntimeConfig {
  if (typeof window !== 'undefined' && window.__CODE_CUISINE_API__) {
    return {
      ...DEFAULT_API_CONFIG,
      ...window.__CODE_CUISINE_API__,
    };
  }

  return DEFAULT_API_CONFIG;
}

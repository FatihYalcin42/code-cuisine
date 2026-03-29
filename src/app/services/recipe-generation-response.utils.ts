import { GeneratedRecipe } from '../models/recipe.model';

/** Describes a successful webhook payload with generated recipes. */
export interface RecipeGenerationSuccessResponse {
  success: true;
  recipes: GeneratedRecipe[];
}

/** Describes the mixed error formats returned by the webhook flow. */
export interface RecipeGenerationErrorResponse {
  success: false;
  error: string | { code?: string; message?: string };
  message?: string;
}

/** Covers both the success and failure payloads from the recipe webhook. */
export type RecipeGenerationResponse =
  | RecipeGenerationSuccessResponse
  | RecipeGenerationErrorResponse;

/** Checks whether the webhook returned a failure payload. */
export function isRecipeGenerationError(
  response: RecipeGenerationResponse,
): response is RecipeGenerationErrorResponse {
  return response.success === false;
}

/** Extracts a stable user-facing message from the webhook failure payload. */
export function getRecipeGenerationErrorMessage(
  response: RecipeGenerationErrorResponse,
): string {
  return readErrorMessage(response.error) ?? response.message ?? 'The recipe could not be generated.';
}

/** Checks whether the backend returned exactly the required number of recipes. */
export function hasExpectedRecipeCount(recipes: GeneratedRecipe[], expectedCount: number): boolean {
  return Array.isArray(recipes) && recipes.length === expectedCount;
}

/** Extracts a message from either a flat or structured error value. */
function readErrorMessage(error: RecipeGenerationErrorResponse['error']): string | null {
  return typeof error === 'string' ? null : error.message ?? null;
}

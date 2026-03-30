import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CookbookStoreService } from './cookbook-store.service';
import { IngredientDraftStateService } from './ingredient-draft-state.service';
import { getApiConfig } from '../config/api.config';
import {
  getRecipeGenerationErrorMessage,
  hasExpectedRecipeCount,
  isRecipeGenerationError,
  type RecipeGenerationResponse,
} from './recipe-generation-response.utils';
import {
  GeneratedRecipe,
  RecipeGenerationIngredient,
  RecipeGenerationPreferences,
  RecipeGenerationRequest,
  type RecipeNutrition,
} from '../models/recipe.model';

const EXPECTED_RECIPE_COUNT = 3;

type PartialGeneratedRecipeResponse = GeneratedRecipe & {
  cookTimeMinutes?: number;
  cuisine?: string;
  diet?: string;
  likesCount?: number;
  nutrition?: RecipeNutrition | null;
  ingredients?: Array<string | { name?: string; amount?: number; unit?: string; source?: string }>;
  extraIngredients?: Array<string | { name?: string; amount?: number; unit?: string }>;
  steps?: Array<string | { title?: string; description?: string }>;
  source?: 'library' | 'generated';
};

type RecipeGenerationStatus = 'idle' | 'loading' | 'success' | 'error';
type IngredientCollections = { userIngredients: string[]; extraIngredients: string[] };

@Injectable({ providedIn: 'root' })
export class RecipeGenerationService {
  private readonly http = inject(HttpClient);
  private readonly cookbookStore = inject(CookbookStoreService);
  private readonly ingredientDraftState = inject(IngredientDraftStateService);
  private readonly webhookUrl = getApiConfig().recipeWebhookUrl;

  readonly generationStatus = signal<RecipeGenerationStatus>('idle');
  readonly generatedRecipes = signal<GeneratedRecipe[]>([]);
  readonly selectedRecipe = signal<GeneratedRecipe | null>(null);
  readonly lastUsedPreferences = signal<RecipeGenerationPreferences | null>(null);
  readonly generationErrorMessage = signal<string | null>(null);
  readonly pendingRequest = signal<RecipeGenerationRequest | null>(null);
  readonly hasPendingRequest = computed(() => this.pendingRequest() !== null);

  /** Queues a new generation request and resets stale UI state from earlier runs. */
  queueRecipeGeneration(request: RecipeGenerationRequest): void {
    this.pendingRequest.set(request);
    this.lastUsedPreferences.set(request.preferences);
    this.generatedRecipes.set([]);
    this.selectedRecipe.set(null);
    this.generationErrorMessage.set(null);
    this.generationStatus.set('idle');
  }

  /** Executes the pending request against the live n8n webhook. */
  async generateQueuedRecipe(): Promise<void> {
    const request = this.pendingRequest();
    if (this.shouldSkipGeneration(request)) return;
    const activeRequest = request as RecipeGenerationRequest;
    this.startGeneration();

    try {
      await this.handleRecipeResponse(activeRequest);
    } catch {
      this.setGenerationError('The recipe service is not reachable right now. Please try again.');
    }
  }

  /** Clears transient generation state while preserving the last entered preferences. */
  resetGenerationState(): void {
    this.generatedRecipes.set([]);
    this.selectedRecipe.set(null);
    this.generationErrorMessage.set(null);
    this.generationStatus.set('idle');
  }

  /** Stores which generated recipe should be opened on the preparation page. */
  selectRecipe(recipe: GeneratedRecipe): void {
    this.selectedRecipe.set(recipe);
  }

  /** Checks whether a new request should be ignored while one is still running. */
  private isGenerationBlocked(): boolean {
    return this.generationStatus() === 'loading';
  }

  /** Checks whether the current request should be skipped before calling the webhook. */
  private shouldSkipGeneration(request: RecipeGenerationRequest | null): boolean {
    if (!request || this.isGenerationBlocked()) {
      this.handleMissingRequest(request);
      return true;
    }

    return false;
  }

  /** Applies the missing-request error without affecting active generation runs. */
  private handleMissingRequest(request: RecipeGenerationRequest | null): void {
    if (request) {
      return;
    }

    this.setGenerationError('No recipe request is ready yet.');
  }

  /** Sets loading state before the webhook request starts. */
  private startGeneration(): void {
    this.generationStatus.set('loading');
    this.generationErrorMessage.set(null);
  }

  /** Requests recipes from the n8n webhook. */
  private requestRecipes(request: RecipeGenerationRequest): Promise<RecipeGenerationResponse> {
    return firstValueFrom(this.http.post<RecipeGenerationResponse>(this.webhookUrl, request));
  }

  /** Executes the webhook request and applies a valid success response. */
  private async handleRecipeResponse(request: RecipeGenerationRequest): Promise<void> {
    const response = await this.requestRecipes(request);
    const recipes = this.normalizeSuccessfulResponse(response, request);

    if (!recipes) {
      return;
    }

    this.completeGeneration(recipes, request.preferences);
  }

  /** Validates the webhook response and normalizes it into UI recipes. */
  private normalizeSuccessfulResponse(
    response: RecipeGenerationResponse,
    request: RecipeGenerationRequest,
  ): GeneratedRecipe[] | null {
    if (isRecipeGenerationError(response)) {
      this.setGenerationError(getRecipeGenerationErrorMessage(response));
      return null;
    }

    if (!this.hasValidRecipeCount(response.recipes)) return null;
    return this.ensureRecipesExist(normalizeRecipesFromResponse(response.recipes, request.preferences, request));
  }

  /** Checks the recipe count and raises the standardized mismatch error when needed. */
  private hasValidRecipeCount(recipes: GeneratedRecipe[]): boolean {
    if (hasExpectedRecipeCount(recipes, EXPECTED_RECIPE_COUNT)) {
      return true;
    }

    this.setRecipeCountError(recipes.length);
    return false;
  }

  /** Persists the final success state after a valid response. */
  private completeGeneration(
    recipes: GeneratedRecipe[],
    preferences: RecipeGenerationPreferences,
  ): void {
    this.generatedRecipes.set(recipes);
    this.selectedRecipe.set(null);
    this.generationStatus.set('success');
    this.pendingRequest.set(null);
    this.ingredientDraftState.resetIngredients();
    void this.cookbookStore.saveGeneratedRecipes(recipes, preferences);
  }

  /** Raises a consistent error state and clears stale recipe results. */
  private setGenerationError(message: string): void {
    this.generatedRecipes.set([]);
    this.generationStatus.set('error');
    this.generationErrorMessage.set(message);
  }

  /** Raises the standardized wrong-count error from the webhook. */
  private setRecipeCountError(actualCount: number): void {
    this.setGenerationError(
      `The recipe service returned ${actualCount} recipes instead of ${EXPECTED_RECIPE_COUNT}.`,
    );
  }

  /** Ensures at least one normalized recipe remains before marking success. */
  private ensureRecipesExist(recipes: GeneratedRecipe[]): GeneratedRecipe[] | null {
    if (recipes.length) {
      return recipes;
    }

    this.setGenerationError('No recipes were returned.');
    return null;
  }
}

/** Normalizes every recipe returned by the backend into the UI's expected shape. */
function normalizeRecipesFromResponse(
  recipes: GeneratedRecipe[],
  preferences: RecipeGenerationPreferences,
  request: RecipeGenerationRequest,
): GeneratedRecipe[] {
  return recipes.map((recipe) => normalizeRecipe(recipe, preferences, request));
}

/** Fills missing generated-recipe fields from the current request preferences and defaults. */
function normalizeRecipe(
  recipe: PartialGeneratedRecipeResponse,
  preferences: RecipeGenerationPreferences,
  request: RecipeGenerationRequest,
): GeneratedRecipe {
  const normalizedIngredients = normalizeIngredientList(recipe.ingredients ?? []);
  const normalizedExtraIngredients = normalizeIngredientList(recipe.extraIngredients ?? []);
  const normalizedSteps = normalizeStepList(recipe.steps ?? []);
  const defaults = buildRecipeDefaults(recipe, preferences);
  const ingredientCollections = buildRecipeIngredients(
    recipe,
    normalizedIngredients,
    normalizedExtraIngredients,
    request,
  );
  return buildNormalizedRecipe(recipe, defaults, ingredientCollections, normalizedIngredients, normalizedSteps);
}

/** Converts request or response diet labels into the UI tag format. */
function normalizeDietTag(diet: string | null): 'Vegetarian' | 'Vegan' | 'Keto' | null {
  if (diet === 'Vegetarian' || diet === 'Vegan' || diet === 'Keto') {
    return diet;
  }

  return null;
}

/** Converts mixed ingredient payloads into the flat string lists used by the current UI. */
function normalizeIngredientList(
  ingredients: Array<string | { name?: string; amount?: number; unit?: string; source?: string }>,
): string[] {
  return ingredients.map((ingredient) => normalizeIngredientLine(ingredient)).filter(Boolean);
}

/** Converts mixed step payloads into plain instruction strings for the current preparation UI. */
function normalizeStepList(steps: Array<string | { title?: string; description?: string }>): string[] {
  return steps.map((step) => normalizeStepLine(step)).filter(Boolean);
}

/** Formats a structured ingredient object into the line-based representation used by the app. */
function formatRichIngredientLine(ingredient: {
  name?: string;
  amount?: number;
  unit?: string;
}): string {
  const name = String(ingredient.name ?? '').trim();

  if (!name) {
    return '';
  }

  return hasMeasuredIngredient(ingredient) ? formatMeasuredIngredient(name, ingredient) : name;
}

/** Formats numeric preparation minutes into the compact badge style used by the UI. */
function formatPrepTime(minutes: number | undefined): string {
  if (!minutes || Number.isNaN(minutes)) {
    return '20 min';
  }

  return `${minutes} min`;
}

/** Maps human-readable cuisine labels to the slugs used by the cookbook store. */
function mapCuisineToSlug(cuisine: string | null): string {
  return CUISINE_SLUGS[cuisine ?? ''] ?? 'fusion';
}

const CUISINE_SLUGS: Record<string, string> = {
  Italian: 'italian',
  it: 'italian',
  German: 'german',
  de: 'german',
  Japanese: 'japanese',
  jp: 'japanese',
  Indian: 'indian',
  in: 'indian',
  Gourmet: 'gourmet',
  gourmet: 'gourmet',
  Fusion: 'fusion',
  fusion: 'fusion',
};

/** Builds the non-list defaults for a generated recipe. */
function buildRecipeDefaults(
  recipe: GeneratedRecipe & {
    cookTimeMinutes?: number;
    cuisine?: string;
    diet?: string;
    likesCount?: number;
  },
  preferences: RecipeGenerationPreferences,
): Partial<GeneratedRecipe> {
  return {
    ...buildRecipeMetrics(recipe, preferences),
    ...buildRecipeClassification(recipe, preferences),
  };
}

/** Builds the normalized list fields for the generated recipe model. */
function buildRecipeLists(
  normalizedIngredients: string[],
  normalizedSteps: string[],
): Pick<GeneratedRecipe, 'ingredients' | 'steps'> {
  return {
    ingredients: normalizedIngredients.filter(Boolean),
    steps: normalizedSteps,
  };
}

/** Builds the final normalized recipe object from the prepared recipe parts. */
function buildNormalizedRecipe(
  recipe: PartialGeneratedRecipeResponse, defaults: Partial<GeneratedRecipe>,
  ingredientCollections: IngredientCollections,
  normalizedIngredients: string[], normalizedSteps: string[],
): GeneratedRecipe {
  return {
    ...recipe,
    ...defaults,
    ...ingredientCollections,
    ...buildRecipeLists(normalizedIngredients, normalizedSteps),
    nutrition: recipe.nutrition ?? null,
  };
}

/** Builds timing and count defaults for a generated recipe. */
function buildRecipeMetrics(
  recipe: GeneratedRecipe & { cookTimeMinutes?: number; likesCount?: number },
  preferences: RecipeGenerationPreferences,
): Pick<GeneratedRecipe, 'source' | 'prepTime' | 'prepTimeMinutes' | 'cookCount' | 'likes'> {
  return {
    source: recipe.source ?? 'generated',
    prepTime: recipe.prepTime ?? formatPrepTime(recipe.cookTimeMinutes),
    prepTimeMinutes: recipe.prepTimeMinutes ?? recipe.cookTimeMinutes ?? null,
    cookCount: recipe.cookCount ?? Math.max(1, preferences.persons),
    likes: recipe.likes ?? recipe.likesCount ?? 0,
  };
}

/** Builds classification defaults such as diet tag and cuisine slug. */
function buildRecipeClassification(
  recipe: GeneratedRecipe & { cuisine?: string; diet?: string },
  preferences: RecipeGenerationPreferences,
): Pick<GeneratedRecipe, 'dietTag' | 'cuisineSlug'> {
  return {
    dietTag: recipe.dietTag ?? normalizeDietTag(recipe.diet ?? preferences.diet),
    cuisineSlug: recipe.cuisineSlug ?? mapCuisineToSlug(recipe.cuisine ?? preferences.cuisine),
  };
}

/** Builds the normalized ingredient collections for a generated recipe. */
function buildRecipeIngredients(
  recipe: GeneratedRecipe & {
    ingredients?: Array<string | { name?: string; amount?: number; unit?: string; source?: string }>;
  },
  normalizedIngredients: string[],
  normalizedExtraIngredients: string[],
  request: RecipeGenerationRequest,
): IngredientCollections {
  const explicitUserIngredients = recipe.userIngredients?.filter(Boolean) ?? [];
  const explicitExtraIngredients = normalizedExtraIngredients.filter(Boolean);

  if (explicitUserIngredients.length || explicitExtraIngredients.length) {
    return {
      userIngredients: explicitUserIngredients,
      extraIngredients: explicitExtraIngredients,
    };
  }

  const sourceSeparatedIngredients = splitIngredientsBySource(recipe.ingredients ?? []);

  if (sourceSeparatedIngredients.userIngredients.length || sourceSeparatedIngredients.extraIngredients.length) {
    return {
      userIngredients: sourceSeparatedIngredients.userIngredients.length
        ? sourceSeparatedIngredients.userIngredients
        : normalizeRequestIngredients(request.ingredients),
      extraIngredients: sourceSeparatedIngredients.extraIngredients,
    };
  }

  const requestUserIngredients = normalizeRequestIngredients(request.ingredients);

  return {
    userIngredients: requestUserIngredients,
    extraIngredients: filterOutRequestIngredients(normalizedIngredients, request.ingredients),
  };
}

/** Formats the original request ingredients for the "Your ingredients" column. */
function normalizeRequestIngredients(ingredients: RecipeGenerationIngredient[]): string[] {
  return ingredients.map((ingredient) => formatRichIngredientLine(ingredient)).filter(Boolean);
}

/** Splits ingredient objects by their declared source when the backend provides it. */
function splitIngredientsBySource(
  ingredients: Array<string | { name?: string; amount?: number; unit?: string; source?: string }>,
): IngredientCollections {
  return ingredients.reduce<IngredientCollections>(
    (collections, ingredient) => {
      if (typeof ingredient === 'string') {
        return collections;
      }

      const normalizedLine = formatRichIngredientLine(ingredient);

      if (!normalizedLine) {
        return collections;
      }

      if (ingredient.source === 'extra') {
        collections.extraIngredients.push(normalizedLine);
      } else {
        collections.userIngredients.push(normalizedLine);
      }

      return collections;
    },
    { userIngredients: [], extraIngredients: [] },
  );
}

/** Removes request ingredients from the full recipe list so only added extras remain. */
function filterOutRequestIngredients(
  ingredients: string[],
  requestIngredients: RecipeGenerationIngredient[],
): string[] {
  const requestIngredientNames = new Set(
    requestIngredients.map((ingredient) => normalizeIngredientName(ingredient.name)),
  );

  return ingredients.filter((ingredient) => !requestIngredientNames.has(normalizeIngredientName(extractIngredientName(ingredient))));
}

/** Extracts the probable ingredient name from a display line such as "200 g spinach". */
function extractIngredientName(ingredientLine: string): string {
  return ingredientLine
    .replace(/^[\d.,/]+\s*/u, '')
    .replace(/^(g|gram|grams|kg|ml|l|piece|pieces|teaspoon|teaspoons|tablespoon|tablespoons)\s+/iu, '')
    .trim();
}

/** Normalizes ingredient names for reliable comparison across request and response payloads. */
function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase();
}

/** Normalizes a mixed ingredient value into the app's line-based representation. */
function normalizeIngredientLine(
  ingredient: string | { name?: string; amount?: number; unit?: string; source?: string },
): string {
  return typeof ingredient === 'string' ? ingredient.trim() : formatRichIngredientLine(ingredient);
}

/** Normalizes a mixed step value into a single preparation line. */
function normalizeStepLine(step: string | { title?: string; description?: string }): string {
  if (typeof step === 'string') {
    return step.trim();
  }

  const title = String(step.title ?? '').trim();
  const description = String(step.description ?? '').trim();
  return title && description ? `${title}: ${description}` : description || title;
}

/** Checks whether an ingredient includes a usable measured amount. */
function hasMeasuredIngredient(ingredient: { amount?: number }): boolean {
  return typeof ingredient.amount === 'number' && ingredient.amount > 0;
}

/** Formats a measured ingredient with amount, unit and name. */
function formatMeasuredIngredient(
  name: string,
  ingredient: { amount?: number; unit?: string },
): string {
  return `${ingredient.amount} ${ingredient.unit ?? ''} ${name}`.trim();
}

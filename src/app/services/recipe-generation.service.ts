import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CookbookStoreService } from './cookbook-store.service';
import {
  GeneratedRecipe,
  RecipeGenerationPreferences,
  RecipeGenerationRequest,
  type RecipeNutrition,
} from '../models/recipe.model';

const EXPECTED_RECIPE_COUNT = 3;

interface RecipeGenerationSuccessResponse {
  success: true;
  recipes: GeneratedRecipe[];
}

interface RecipeGenerationErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type RecipeGenerationResponse =
  | RecipeGenerationSuccessResponse
  | RecipeGenerationErrorResponse;

type RecipeGenerationStatus = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class RecipeGenerationService {
  private readonly http = inject(HttpClient);
  private readonly cookbookStore = inject(CookbookStoreService);
  private readonly webhookUrl = '/api/generate-recipe-v2';

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

    if (!request) {
      this.generationStatus.set('error');
      this.generationErrorMessage.set('No recipe request is ready yet.');
      return;
    }

    if (this.generationStatus() === 'loading') {
      return;
    }

    this.generationStatus.set('loading');
    this.generationErrorMessage.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<RecipeGenerationResponse>(this.webhookUrl, request),
      );

      if (!response.success) {
        this.generatedRecipes.set([]);
        this.generationStatus.set('error');
        this.generationErrorMessage.set(response.error.message);
        return;
      }

      if (!Array.isArray(response.recipes) || response.recipes.length !== EXPECTED_RECIPE_COUNT) {
        this.generatedRecipes.set([]);
        this.generationStatus.set('error');
        this.generationErrorMessage.set(
          `The recipe service returned ${response.recipes?.length ?? 0} recipes instead of ${EXPECTED_RECIPE_COUNT}.`,
        );
        return;
      }

      const recipes = normalizeRecipesFromResponse(response.recipes, request.preferences);

      if (!recipes.length) {
        this.generatedRecipes.set([]);
        this.generationStatus.set('error');
        this.generationErrorMessage.set('No recipes were returned.');
        return;
      }

      this.generatedRecipes.set(recipes);
      this.selectedRecipe.set(null);
      this.generationStatus.set('success');
      this.pendingRequest.set(null);
      void this.cookbookStore.saveGeneratedRecipes(recipes, request.preferences);
    } catch {
      this.generatedRecipes.set([]);
      this.generationStatus.set('error');
      this.generationErrorMessage.set(
        'The recipe service is not reachable right now. Please try again.',
      );
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
}

/** Normalizes every recipe returned by the backend into the UI's expected shape. */
function normalizeRecipesFromResponse(
  recipes: GeneratedRecipe[],
  preferences: RecipeGenerationPreferences,
): GeneratedRecipe[] {
  return recipes.map((recipe) => normalizeRecipe(recipe, preferences));
}

/** Fills missing generated-recipe fields from the current request preferences and defaults. */
function normalizeRecipe(
  recipe: GeneratedRecipe & {
    cookTimeMinutes?: number;
    cuisine?: string;
    diet?: string;
    likesCount?: number;
    nutrition?: RecipeNutrition | null;
    ingredients?: Array<string | { name?: string; amount?: number; unit?: string; source?: string }>;
    extraIngredients?: Array<string | { name?: string; amount?: number; unit?: string }>;
    steps?: Array<string | { title?: string; description?: string }>;
    source?: 'library' | 'generated';
  },
  preferences: RecipeGenerationPreferences,
): GeneratedRecipe {
  const normalizedIngredients = normalizeIngredientList(recipe.ingredients ?? []);
  const normalizedExtraIngredients = normalizeIngredientList(recipe.extraIngredients ?? []);

  return {
    ...recipe,
    source: recipe.source ?? 'generated',
    prepTime: recipe.prepTime ?? formatPrepTime(recipe.cookTimeMinutes),
    prepTimeMinutes: recipe.prepTimeMinutes ?? recipe.cookTimeMinutes ?? null,
    cookCount: recipe.cookCount ?? Math.max(1, preferences.persons),
    likes: recipe.likes ?? recipe.likesCount ?? 0,
    dietTag: recipe.dietTag ?? normalizeDietTag(recipe.diet ?? preferences.diet),
    cuisineSlug: recipe.cuisineSlug ?? mapCuisineToSlug(recipe.cuisine ?? preferences.cuisine),
    userIngredients: recipe.userIngredients ?? normalizedIngredients.filter(Boolean),
    extraIngredients: normalizedExtraIngredients.filter(Boolean),
    ingredients: normalizedIngredients.filter(Boolean),
    steps: normalizeStepList(recipe.steps ?? []),
    nutrition: recipe.nutrition ?? null,
  };
}

/** Builds a lightweight description prefix from the selected cuisine and diet preferences. */
function buildDescription(
  cuisineLabel: string | undefined,
  dietLabel: string | undefined,
  baseDescription: string,
): string {
  const prefixes = [cuisineLabel, dietLabel]
    .filter((value): value is string => Boolean(value && value !== 'No preferences'))
    .map((value) => value.toLowerCase());

  if (!prefixes.length) {
    return baseDescription;
  }

  return `${capitalize(prefixes.join(' '))} inspired. ${baseDescription}`;
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
  return ingredients
    .map((ingredient) => {
      if (typeof ingredient === 'string') {
        return ingredient.trim();
      }

      return formatRichIngredientLine(ingredient);
    })
    .filter(Boolean);
}

/** Converts mixed step payloads into plain instruction strings for the current preparation UI. */
function normalizeStepList(steps: Array<string | { title?: string; description?: string }>): string[] {
  return steps
    .map((step) => {
      if (typeof step === 'string') {
        return step.trim();
      }

      const title = String(step.title ?? '').trim();
      const description = String(step.description ?? '').trim();

      if (title && description) {
        return `${title}: ${description}`;
      }

      return description || title;
    })
    .filter(Boolean);
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

  if (typeof ingredient.amount === 'number' && ingredient.amount > 0) {
    return `${ingredient.amount} ${ingredient.unit ?? ''} ${name}`.trim();
  }

  return name;
}

/** Formats numeric preparation minutes into the compact badge style used by the UI. */
function formatPrepTime(minutes: number | undefined): string {
  if (!minutes || Number.isNaN(minutes)) {
    return '20 min';
  }

  return `${minutes} min`;
}

/** Parses a compact preparation-time string back into a numeric minute value. */
function parsePrepTimeMinutes(prepTime: string): number | null {
  const minutes = Number.parseInt(prepTime.replace(/\D/g, ''), 10);
  return Number.isNaN(minutes) ? null : minutes;
}

/** Maps human-readable cuisine labels to the slugs used by the cookbook store. */
function mapCuisineToSlug(cuisine: string | null): string {
  switch (cuisine) {
    case 'Italian':
    case 'it':
      return 'italian';
    case 'German':
    case 'de':
      return 'german';
    case 'Japanese':
    case 'jp':
      return 'japanese';
    case 'Indian':
    case 'in':
      return 'indian';
    case 'Gourmet':
    case 'gourmet':
      return 'gourmet';
    case 'Fusion':
    case 'fusion':
      return 'fusion';
    default:
      return 'fusion';
  }
}

/** Title-cases a free-text string for mock recipe naming. */
function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => capitalize(part))
    .join(' ');
}

/** Uppercases only the first character of a string. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

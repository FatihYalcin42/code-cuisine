import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CookbookStoreService } from './cookbook-store.service';
import {
  GeneratedRecipe,
  RecipeGenerationIngredient,
  RecipeGenerationPreferences,
  RecipeGenerationRequest,
  type RecipeNutrition,
} from '../models/recipe.model';

const USE_MOCK_RECIPE_GENERATION = false;
const MOCK_RECIPE_GENERATION_DELAY_MS = 1800;

interface RecipeGenerationSuccessResponse {
  success: true;
  recipes: GeneratedRecipe[];
}

interface LegacyRecipeGenerationSuccessResponse {
  success: true;
  recipe: GeneratedRecipe;
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
  | LegacyRecipeGenerationSuccessResponse
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

  queueRecipeGeneration(request: RecipeGenerationRequest): void {
    this.pendingRequest.set(request);
    this.lastUsedPreferences.set(request.preferences);
    this.generatedRecipes.set([]);
    this.selectedRecipe.set(null);
    this.generationErrorMessage.set(null);
    this.generationStatus.set('idle');
  }

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

    if (USE_MOCK_RECIPE_GENERATION) {
      await delay(MOCK_RECIPE_GENERATION_DELAY_MS);

      const recipes = buildMockRecipes(request);

      this.generatedRecipes.set(recipes);
      this.selectedRecipe.set(null);
      this.generationStatus.set('success');
      this.pendingRequest.set(null);
      void this.cookbookStore.saveGeneratedRecipes(recipes, request.preferences);
      return;
    }

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

      const recipes = normalizeRecipesFromResponse(
        'recipes' in response ? response.recipes : [response.recipe],
        request.preferences,
      );

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

  resetGenerationState(): void {
    this.generatedRecipes.set([]);
    this.selectedRecipe.set(null);
    this.generationErrorMessage.set(null);
    this.generationStatus.set('idle');
  }

  selectRecipe(recipe: GeneratedRecipe): void {
    this.selectedRecipe.set(recipe);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function buildMockRecipes(request: RecipeGenerationRequest): GeneratedRecipe[] {
  const normalizedIngredients = request.ingredients
    .filter((ingredient) => ingredient.name.trim().length > 0)
    .map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.trim(),
    }));
  const ingredientNames = normalizedIngredients.map((ingredient) => ingredient.name);
  const topIngredients = [
    ingredientNames[0] ?? 'vegetables',
    ingredientNames[1] ?? ingredientNames[0] ?? 'rice',
    ingredientNames[2] ?? ingredientNames[1] ?? 'herbs',
  ];
  const cookingTime = resolvePrepTime(request.preferences.cookingTime);
  const cuisineLabel = request.preferences.cuisine?.trim();
  const dietLabel = request.preferences.diet?.trim();
  const portionsLabel = request.preferences.portions > 1 ? `${request.preferences.portions} portions` : '1 portion';
  const pantryItems = ['olive oil', 'salt', 'pepper', 'garlic'];
  const skilletIngredients = buildRecipeIngredientGroups(
    normalizedIngredients,
    [topIngredients[0], topIngredients[1]],
    [pantryItems[0], pantryItems[1]],
  );
  const bowlIngredients = buildRecipeIngredientGroups(
    normalizedIngredients,
    [topIngredients[1], topIngredients[2]],
    [pantryItems[0], pantryItems[2]],
  );
  const ovenIngredients = buildRecipeIngredientGroups(
    normalizedIngredients,
    [topIngredients[0], topIngredients[2]],
    [pantryItems[0], pantryItems[3]],
  );

  return [
    {
      title: `${toTitleCase(topIngredients[0])} skillet`,
      description: buildDescription(
        cuisineLabel,
        dietLabel,
        `A short pan recipe with ${topIngredients[0]} and ${topIngredients[1]} for ${portionsLabel}.`,
      ),
      prepTime: cookingTime,
      cookCount: 1,
      dietTag: normalizeDietTag(request.preferences.diet),
      userIngredients: skilletIngredients.userIngredients,
      extraIngredients: skilletIngredients.extraIngredients,
      ingredients: [...skilletIngredients.userIngredients, ...skilletIngredients.extraIngredients],
      steps: [
        `Prepare ${topIngredients[0]} and ${topIngredients[1]} in bite-size pieces so they cook evenly. Keep everything ready beside the stove before you start the pan.`,
        `Heat a pan with ${pantryItems[0]} and cook everything for 6 to 8 minutes until lightly golden. Stir from time to time so the ingredients color without sticking.`,
        `Season with ${pantryItems[1]} and taste before serving. Plate it while still hot so the texture stays at its best.`,
      ],
      cuisineSlug: mapCuisineToSlug(request.preferences.cuisine),
      prepTimeMinutes: parsePrepTimeMinutes(cookingTime),
      likes: 0,
      nutrition: null,
    },
    {
      title: `${toTitleCase(topIngredients[1])} bowl`,
      description: buildDescription(
        cuisineLabel,
        dietLabel,
        `An easy bowl using ${topIngredients[1]}, ${topIngredients[2]} and the ingredients you already entered.`,
      ),
      prepTime: cookingTime,
      cookCount: 2,
      dietTag: normalizeDietTag(request.preferences.diet),
      userIngredients: bowlIngredients.userIngredients,
      extraIngredients: bowlIngredients.extraIngredients,
      ingredients: [...bowlIngredients.userIngredients, ...bowlIngredients.extraIngredients],
      steps: [
        `Cook or warm the base ingredients until tender and ready to layer. This gives the bowl a warm, balanced base.`,
        `Combine ${topIngredients[1]} with ${topIngredients[2]} in a bowl and arrange everything neatly. Try to keep the components separate at first for a cleaner look.`,
        `Finish with ${pantryItems[0]} and ${pantryItems[2]} before serving. Toss lightly only at the end so the textures stay fresh.`,
      ],
      cuisineSlug: mapCuisineToSlug(request.preferences.cuisine),
      prepTimeMinutes: parsePrepTimeMinutes(cookingTime),
      likes: 0,
      nutrition: null,
    },
    {
      title: `${toTitleCase(topIngredients[0])} oven mix`,
      description: buildDescription(
        cuisineLabel,
        dietLabel,
        `A simple tray-style recipe with ${topIngredients[0]}, ${topIngredients[2]} and very little prep.`,
      ),
      prepTime: cookingTime,
      cookCount: 3,
      dietTag: normalizeDietTag(request.preferences.diet),
      userIngredients: ovenIngredients.userIngredients,
      extraIngredients: ovenIngredients.extraIngredients,
      ingredients: [...ovenIngredients.userIngredients, ...ovenIngredients.extraIngredients],
      steps: [
        `Spread ${topIngredients[0]} and ${topIngredients[2]} on a baking tray in a single layer. Give everything a little space so it roasts instead of steaming.`,
        `Add ${pantryItems[0]} and ${pantryItems[3]}, then roast until lightly golden and tender. Turn the tray once during cooking so the color stays even.`,
        `Taste, adjust seasoning and plate while warm. Let it rest briefly before serving if you want the flavors to settle.`,
      ],
      cuisineSlug: mapCuisineToSlug(request.preferences.cuisine),
      prepTimeMinutes: parsePrepTimeMinutes(cookingTime),
      likes: 0,
      nutrition: null,
    },
  ];
}

function normalizeRecipesFromResponse(
  recipes: GeneratedRecipe[],
  preferences: RecipeGenerationPreferences,
): GeneratedRecipe[] {
  return recipes.map((recipe) => normalizeRecipe(recipe, preferences));
}

function normalizeRecipe(
  recipe: GeneratedRecipe & {
    cookTimeMinutes?: number;
    cuisine?: string;
    diet?: string;
    likesCount?: number;
    nutrition?: RecipeNutrition | null;
    ingredients?: Array<string | { name?: string; amount?: number; unit?: string; source?: string }>;
    extraIngredients?: Array<string | { name?: string; amount?: number; unit?: string }>;
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
    steps: recipe.steps.map((step) => String(step).trim()).filter(Boolean),
    nutrition: recipe.nutrition ?? null,
  };
}

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

function normalizeDietTag(diet: string | null): 'Vegetarian' | 'Vegan' | 'Keto' | null {
  if (diet === 'Vegetarian' || diet === 'Vegan' || diet === 'Keto') {
    return diet;
  }

  return null;
}

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

function buildRecipeIngredientGroups(
  enteredIngredients: RecipeGenerationIngredient[],
  preferredNames: string[],
  pantryItems: string[],
): { userIngredients: string[]; extraIngredients: string[] } {
  const selectedIngredients = preferredNames
    .map((name) => enteredIngredients.find((ingredient) => ingredient.name === name))
    .filter((ingredient): ingredient is RecipeGenerationIngredient => Boolean(ingredient))
    .map((ingredient) => formatIngredientLine(ingredient));
  const remainingIngredients = enteredIngredients
    .filter((ingredient) => !preferredNames.includes(ingredient.name))
    .slice(0, 2)
    .map((ingredient) => formatIngredientLine(ingredient));

  return {
    userIngredients: [...selectedIngredients, ...remainingIngredients],
    extraIngredients: pantryItems,
  };
}

function formatIngredientLine(ingredient: RecipeGenerationIngredient): string {
  if (Number.isNaN(ingredient.amount) || ingredient.amount <= 0) {
    return ingredient.name;
  }

  const unitLabel = ingredient.unit === 'piece' ? 'piece' : ingredient.unit;
  return `${ingredient.amount} ${unitLabel} ${ingredient.name}`.trim();
}

function resolvePrepTime(cookingTime: string | null): string {
  switch (cookingTime) {
    case 'Quick':
      return '15 min';
    case 'Medium':
      return '30 min';
    case 'Complex':
      return '45 min';
    default:
      return '20 min';
  }
}

function formatPrepTime(minutes: number | undefined): string {
  if (!minutes || Number.isNaN(minutes)) {
    return '20 min';
  }

  return `${minutes} min`;
}

function parsePrepTimeMinutes(prepTime: string): number | null {
  const minutes = Number.parseInt(prepTime.replace(/\D/g, ''), 10);
  return Number.isNaN(minutes) ? null : minutes;
}

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

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => capitalize(part))
    .join(' ');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

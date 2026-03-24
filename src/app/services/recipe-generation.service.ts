import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const USE_MOCK_RECIPE_GENERATION = true;

export interface RecipeGenerationIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeGenerationPreferences {
  portions: number;
  persons: number;
  cookingTime: string | null;
  cuisine: string | null;
  diet: string | null;
}

export interface RecipeGenerationRequest {
  ingredients: RecipeGenerationIngredient[];
  preferences: RecipeGenerationPreferences;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  prepTime: string;
  ingredients: string[];
  steps: string[];
}

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
  private readonly webhookUrl = '/api/generate-recipe';

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
      const recipes = buildMockRecipes(request);

      this.generatedRecipes.set(recipes);
      this.selectedRecipe.set(null);
      this.generationStatus.set('success');
      this.pendingRequest.set(null);
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

      const recipes = 'recipes' in response ? response.recipes : [response.recipe];

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

  return [
    {
      title: `${toTitleCase(topIngredients[0])} skillet`,
      description: buildDescription(
        cuisineLabel,
        dietLabel,
        `A short pan recipe with ${topIngredients[0]} and ${topIngredients[1]} for ${portionsLabel}.`,
      ),
      prepTime: cookingTime,
      ingredients: buildRecipeIngredientList(
        normalizedIngredients,
        [topIngredients[0], topIngredients[1]],
        [pantryItems[0], pantryItems[1]],
      ),
      steps: [
        `Prepare ${topIngredients[0]} and ${topIngredients[1]} in bite-size pieces.`,
        `Heat a pan with ${pantryItems[0]} and cook everything for 6 to 8 minutes.`,
        `Season with ${pantryItems[1]} and serve immediately.`,
      ],
    },
    {
      title: `${toTitleCase(topIngredients[1])} bowl`,
      description: buildDescription(
        cuisineLabel,
        dietLabel,
        `An easy bowl using ${topIngredients[1]}, ${topIngredients[2]} and the ingredients you already entered.`,
      ),
      prepTime: cookingTime,
      ingredients: buildRecipeIngredientList(
        normalizedIngredients,
        [topIngredients[1], topIngredients[2]],
        [pantryItems[0], pantryItems[2]],
      ),
      steps: [
        `Cook or warm the base ingredients until tender.`,
        `Combine ${topIngredients[1]} with ${topIngredients[2]} in a bowl.`,
        `Finish with ${pantryItems[0]} and ${pantryItems[2]} before serving.`,
      ],
    },
    {
      title: `${toTitleCase(topIngredients[0])} oven mix`,
      description: buildDescription(
        cuisineLabel,
        dietLabel,
        `A simple tray-style recipe with ${topIngredients[0]}, ${topIngredients[2]} and very little prep.`,
      ),
      prepTime: cookingTime,
      ingredients: buildRecipeIngredientList(
        normalizedIngredients,
        [topIngredients[0], topIngredients[2]],
        [pantryItems[0], pantryItems[3]],
      ),
      steps: [
        `Spread ${topIngredients[0]} and ${topIngredients[2]} on a baking tray.`,
        `Add ${pantryItems[0]} and ${pantryItems[3]}, then roast until lightly golden.`,
        `Taste, adjust seasoning and plate while warm.`,
      ],
    },
  ];
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

function buildRecipeIngredientList(
  enteredIngredients: RecipeGenerationIngredient[],
  preferredNames: string[],
  pantryItems: string[],
): string[] {
  const selectedIngredients = preferredNames
    .map((name) => enteredIngredients.find((ingredient) => ingredient.name === name))
    .filter((ingredient): ingredient is RecipeGenerationIngredient => Boolean(ingredient))
    .map((ingredient) => formatIngredientLine(ingredient));
  const remainingIngredients = enteredIngredients
    .filter((ingredient) => !preferredNames.includes(ingredient.name))
    .slice(0, 2)
    .map((ingredient) => formatIngredientLine(ingredient));

  return [...selectedIngredients, ...remainingIngredients, ...pantryItems];
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

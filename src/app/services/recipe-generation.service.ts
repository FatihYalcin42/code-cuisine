import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  readonly generationErrorMessage = signal<string | null>(null);
  readonly pendingRequest = signal<RecipeGenerationRequest | null>(null);
  readonly hasPendingRequest = computed(() => this.pendingRequest() !== null);

  queueRecipeGeneration(request: RecipeGenerationRequest): void {
    this.pendingRequest.set(request);
    this.generatedRecipes.set([]);
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
    this.generationErrorMessage.set(null);
    this.generationStatus.set('idle');
  }
}

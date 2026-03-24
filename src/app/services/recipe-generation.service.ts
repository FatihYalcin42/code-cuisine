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
  | RecipeGenerationErrorResponse;

type RecipeGenerationStatus = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class RecipeGenerationService {
  private readonly http = inject(HttpClient);
  private readonly webhookUrl = 'http://localhost:5678/webhook/generate-recipe';

  readonly generationStatus = signal<RecipeGenerationStatus>('idle');
  readonly generatedRecipe = signal<GeneratedRecipe | null>(null);
  readonly generationErrorMessage = signal<string | null>(null);
  readonly pendingRequest = signal<RecipeGenerationRequest | null>(null);
  readonly hasPendingRequest = computed(() => this.pendingRequest() !== null);

  queueRecipeGeneration(request: RecipeGenerationRequest): void {
    this.pendingRequest.set(request);
    this.generatedRecipe.set(null);
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
        this.generatedRecipe.set(null);
        this.generationStatus.set('error');
        this.generationErrorMessage.set(response.error.message);
        return;
      }

      this.generatedRecipe.set(response.recipe);
      this.generationStatus.set('success');
      this.pendingRequest.set(null);
    } catch {
      this.generatedRecipe.set(null);
      this.generationStatus.set('error');
      this.generationErrorMessage.set(
        'The recipe service is not reachable right now. Please try again.',
      );
    }
  }

  resetGenerationState(): void {
    this.generatedRecipe.set(null);
    this.generationErrorMessage.set(null);
    this.generationStatus.set('idle');
  }
}

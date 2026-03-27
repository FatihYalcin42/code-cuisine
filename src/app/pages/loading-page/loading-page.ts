import { Component, computed, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../../services/recipe-generation.service';

@Component({
  selector: 'app-loading-page',
  imports: [RouterLink],
  templateUrl: './loading-page.html',
  styleUrl: './loading-page.scss',
})
export class LoadingPageComponent {
  private readonly recipeGeneration = inject(RecipeGenerationService);
  private readonly router = inject(Router);
  protected readonly generationStatus = this.recipeGeneration.generationStatus;
  protected readonly generatedRecipes = this.recipeGeneration.generatedRecipes;
  protected readonly generationErrorMessage = this.recipeGeneration.generationErrorMessage;
  protected readonly hasGeneratedRecipes = computed(() => this.generatedRecipes().length > 0);
  protected readonly canShowLoader = computed(
    () => this.generationStatus() !== 'success' || !this.hasGeneratedRecipes(),
  );

  /** Starts the pending generation request and redirects once valid recipes are ready. */
  constructor() {
    effect(() => {
      if (this.generationStatus() === 'success' && this.hasGeneratedRecipes()) {
        void this.router.navigateByUrl('/results');
      }
    });

    void this.recipeGeneration.generateQueuedRecipe();
  }

  /** Re-runs the last pending generation request after a failed attempt. */
  protected retryGeneration(): void {
    this.recipeGeneration.resetGenerationState();
    void this.recipeGeneration.generateQueuedRecipe();
  }
}

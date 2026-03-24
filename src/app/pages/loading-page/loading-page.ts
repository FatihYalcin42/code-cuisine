import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../../services/recipe-generation.service';

@Component({
  selector: 'app-loading-page',
  imports: [RouterLink],
  templateUrl: './loading-page.html',
  styleUrl: './loading-page.scss',
})
export class LoadingPageComponent {
  private readonly recipeGeneration = inject(RecipeGenerationService);
  protected readonly generationStatus = this.recipeGeneration.generationStatus;
  protected readonly generatedRecipe = this.recipeGeneration.generatedRecipe;
  protected readonly generationErrorMessage = this.recipeGeneration.generationErrorMessage;
  protected readonly canShowLoader = computed(() => this.generationStatus() !== 'success');

  constructor() {
    void this.recipeGeneration.generateQueuedRecipe();
  }

  protected retryGeneration(): void {
    this.recipeGeneration.resetGenerationState();
    void this.recipeGeneration.generateQueuedRecipe();
  }
}

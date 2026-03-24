import { Component, inject } from '@angular/core';
import { RecipeGenerationService } from '../../services/recipe-generation.service';

@Component({
  selector: 'app-results-page',
  templateUrl: './results-page.html',
  styleUrl: './results-page.scss',
})
export class ResultsPageComponent {
  protected readonly recipeGeneration = inject(RecipeGenerationService);
  protected readonly generatedRecipe = this.recipeGeneration.generatedRecipe;
}

import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  GeneratedRecipe,
  RecipeGenerationService,
} from '../../services/recipe-generation.service';

@Component({
  selector: 'app-results-page',
  imports: [RouterLink],
  templateUrl: './results-page.html',
  styleUrl: './results-page.scss',
})
export class ResultsPageComponent {
  protected readonly recipeGeneration = inject(RecipeGenerationService);
  private readonly router = inject(Router);
  protected readonly generatedRecipes = this.recipeGeneration.generatedRecipes;

  protected viewRecipe(recipe: GeneratedRecipe): void {
    this.recipeGeneration.selectRecipe(recipe);
    void this.router.navigateByUrl('/preparation');
  }
}

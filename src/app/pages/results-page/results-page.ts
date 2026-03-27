import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../../services/recipe-generation.service';
import { GeneratedRecipe } from '../../models/recipe.model';

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
  protected readonly displayRecipes = computed(() => this.generatedRecipes());
  protected readonly selectedPreferenceTags = computed(() => {
    const preferences = this.recipeGeneration.lastUsedPreferences();

    if (!preferences) {
      return [];
    }

    return [preferences.cuisine, preferences.cookingTime, preferences.diet]
      .filter((value): value is string => Boolean(value && value !== 'No preferences'))
      .map((value) => value.trim());
  });

  protected viewRecipe(recipe: GeneratedRecipe): void {
    this.recipeGeneration.selectRecipe(recipe);
    void this.router.navigate(['/preparation'], { queryParams: { from: 'results' } });
  }
}

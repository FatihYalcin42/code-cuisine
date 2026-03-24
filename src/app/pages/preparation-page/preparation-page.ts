import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../../services/recipe-generation.service';

@Component({
  selector: 'app-preparation-page',
  imports: [RouterLink],
  templateUrl: './preparation-page.html',
  styleUrl: './preparation-page.scss',
})
export class PreparationPageComponent {
  private readonly recipeGeneration = inject(RecipeGenerationService);
  protected readonly selectedRecipe = computed(
    () => this.recipeGeneration.selectedRecipe() ?? this.recipeGeneration.generatedRecipes()[0] ?? null,
  );
}

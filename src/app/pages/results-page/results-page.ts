import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  GeneratedRecipe,
  RecipeGenerationService,
} from '../../services/recipe-generation.service';

const RESULTS_PAGE_FALLBACK_RECIPES: GeneratedRecipe[] = [
  {
    title: 'Pasta with spinach and cherry tommatoes',
    description: 'A creamy weeknight pasta with fresh greens and a fast tomato finish.',
    prepTime: '20min',
    cookCount: 2,
    ingredients: ['80g Pasta noodles', '100g Baby spinach', '150g Cherry tomatoes'],
    steps: ['Boil pasta.', 'Cook tomatoes and spinach.', 'Fold everything together and serve.'],
  },
  {
    title: 'Crispy potato skillet',
    description: 'Golden potatoes with herbs, onion and a quick pan sauce.',
    prepTime: '30min',
    cookCount: 1,
    ingredients: ['500g Potatoes', '1 Onion', 'Herbs'],
    steps: ['Slice potatoes.', 'Pan fry until crisp.', 'Finish with herbs and seasoning.'],
  },
  {
    title: 'Vegetable rice bowl',
    description: 'A light bowl with rice, roasted vegetables and a bright dressing.',
    prepTime: '25min',
    cookCount: 1,
    ingredients: ['150g Rice', '1 Zucchini', '1 Carrot'],
    steps: ['Cook rice.', 'Roast vegetables.', 'Assemble bowl and dress before serving.'],
  },
];

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
  protected readonly displayRecipes = computed(() => {
    const recipes = this.generatedRecipes();

    return recipes.length ? recipes : RESULTS_PAGE_FALLBACK_RECIPES;
  });
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

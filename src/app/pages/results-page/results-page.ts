import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../../services/recipe-generation.service';
import { GeneratedRecipe } from '../../models/recipe.model';

const RESULTS_PAGE_FALLBACK_RECIPES: GeneratedRecipe[] = [
  {
    title: 'Pasta with spinach and cherry tommatoes',
    description: 'A creamy weeknight pasta with fresh greens and a fast tomato finish.',
    prepTime: '20min',
    cookCount: 2,
    dietTag: 'Vegetarian',
    userIngredients: ['80g Pasta noodles', '100g Baby spinach', '150g Cherry tomatoes'],
    extraIngredients: ['30ml Olive oil', '40g Parmesan cheese'],
    ingredients: ['80g Pasta noodles', '100g Baby spinach', '150g Cherry tomatoes'],
    steps: [
      'Bring a pot of salted water to a boil and cook the pasta until al dente. Reserve a small cup of pasta water before draining.',
      'Heat a little olive oil in a pan, then cook the cherry tomatoes until they soften and start to burst. Add the spinach and stir until it has just wilted.',
      'Add the pasta to the pan and mix everything together until glossy. Loosen with a splash of pasta water if needed, then season and serve warm.',
    ],
  },
  {
    title: 'Crispy potato skillet',
    description: 'Golden potatoes with herbs, onion and a quick pan sauce.',
    prepTime: '30min',
    cookCount: 1,
    dietTag: null,
    userIngredients: ['500g Potatoes', '1 Onion'],
    extraIngredients: ['Herbs', 'Olive oil'],
    ingredients: ['500g Potatoes', '1 Onion', 'Herbs'],
    steps: [
      'Wash the potatoes well and slice them into thin, even pieces. Peel and finely slice the onion so it cooks at the same pace.',
      'Heat a large pan with a little oil and cook the potatoes over medium heat until they turn golden and crisp around the edges. Add the onion halfway through so it softens without burning.',
      'Finish the skillet with herbs, salt and pepper, then toss everything together. Let it sit for a minute in the pan so the flavors settle before serving.',
    ],
  },
  {
    title: 'Vegetable rice bowl',
    description: 'A light bowl with rice, roasted vegetables and a bright dressing.',
    prepTime: '25min',
    cookCount: 1,
    dietTag: 'Vegan',
    userIngredients: ['150g Rice', '1 Zucchini', '1 Carrot'],
    extraIngredients: ['Dressing', 'Salt and pepper'],
    ingredients: ['150g Rice', '1 Zucchini', '1 Carrot'],
    steps: [
      'Cook the rice according to the package instructions until tender and fluffy. Keep it covered for a few minutes so it finishes steaming.',
      'Slice the zucchini and carrot into bite-size pieces, then roast or saute them until lightly browned but still tender. Season them while they are hot so they absorb the flavor.',
      'Fill a bowl with the rice and arrange the vegetables on top. Finish with your dressing or seasoning and serve straight away.',
    ],
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

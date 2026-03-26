import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GeneratedRecipe, RecipeGenerationService } from '../../services/recipe-generation.service';

type CookbookLikedRecipe = GeneratedRecipe & {
  likes: number;
};

type CookbookCuisineCategory = {
  slug: string;
  title: string;
  imagePath: string;
  emoji: string;
};

const COOKBOOK_FALLBACK_RECIPES: CookbookLikedRecipe[] = [
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
    likes: 66,
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
    likes: 54,
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
    likes: 42,
  },
  {
    title: 'Creamy garlic shrimp pasta',
    description: 'A rich pasta dish with garlic, shrimp and a silky pan sauce.',
    prepTime: '22min',
    cookCount: 2,
    dietTag: null,
    userIngredients: ['200g Pasta', '180g Shrimp', '2 Garlic cloves'],
    extraIngredients: ['60ml Cream', '20g Parmesan cheese'],
    ingredients: ['200g Pasta', '180g Shrimp', '2 Garlic cloves', '60ml Cream'],
    steps: [
      'Cook the pasta in salted water until just al dente and reserve a little cooking water before draining. Keep the pasta warm while you finish the sauce.',
      'Meanwhile, saute the garlic in a little oil, then add the shrimp and cook until pink on both sides. Stir in the cream and let the sauce bubble gently for a moment.',
      'Add the pasta to the pan and toss everything together until coated. Use a splash of pasta water if needed, then finish with parmesan and black pepper.',
    ],
    likes: 58,
  },
  {
    title: 'Low carb vegan bowl',
    description: 'A fresh, colorful bowl with roasted vegetables and a herby dressing.',
    prepTime: '18min',
    cookCount: 1,
    dietTag: 'Vegan',
    userIngredients: ['1 Zucchini', '1 Bell pepper', '1 Avocado'],
    extraIngredients: ['Lemon juice', 'Mixed seeds'],
    ingredients: ['1 Zucchini', '1 Bell pepper', '1 Avocado', 'Lemon juice'],
    steps: [
      'Slice the vegetables into even pieces and roast or saute them until they soften and pick up a little color. Season them while still warm so they absorb the flavor.',
      'Meanwhile, mash the avocado lightly with lemon juice to make a quick creamy base. Keep it slightly chunky so the bowl still has texture.',
      'Arrange everything in a bowl and finish with seeds or herbs on top. Serve right away while the vegetables are still warm.',
    ],
    likes: 49,
  },
];

const COOKBOOK_CUISINE_CATEGORIES: CookbookCuisineCategory[] = [
  { slug: 'italian', title: 'Italian cuisine', imagePath: '/Icons/italien.svg', emoji: '🍝' },
  { slug: 'german', title: 'German cuisine', imagePath: '/Icons/german.svg', emoji: '🥨' },
  { slug: 'japanese', title: 'Japanese cuisine', imagePath: '/Icons/japan.svg', emoji: '🥢' },
  { slug: 'gourmet', title: 'Gourmet cuisine', imagePath: '/Icons/gourmet.svg', emoji: '✨' },
  { slug: 'indian', title: 'Indian cuisine', imagePath: '/Icons/indien.svg', emoji: '🍛' },
  { slug: 'fusion', title: 'Fusion cuisine', imagePath: '/Icons/fusion.svg', emoji: '🫓' },
];

@Component({
  selector: 'app-cookbook-page',
  imports: [RouterLink],
  templateUrl: './cookbook-page.html',
  styleUrl: './cookbook-page.scss',
})
export class CookbookPageComponent {
  private readonly recipeGeneration = inject(RecipeGenerationService);
  private readonly router = inject(Router);
  protected readonly likedRecipes = computed(() =>
    [...COOKBOOK_FALLBACK_RECIPES].sort((left, right) => right.likes - left.likes).slice(0, 5),
  );
  protected readonly cuisineCategories = COOKBOOK_CUISINE_CATEGORIES;

  protected openRecipe(recipe: GeneratedRecipe): void {
    this.recipeGeneration.selectRecipe(recipe);
    void this.router.navigate(['/preparation'], { queryParams: { from: 'cookbook' } });
  }
}

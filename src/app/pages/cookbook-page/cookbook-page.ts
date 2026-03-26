import { Component, inject } from '@angular/core';
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
    ingredients: ['80g Pasta noodles', '100g Baby spinach', '150g Cherry tomatoes'],
    steps: ['Boil pasta.', 'Cook tomatoes and spinach.', 'Fold everything together and serve.'],
    likes: 66,
  },
  {
    title: 'Crispy potato skillet',
    description: 'Golden potatoes with herbs, onion and a quick pan sauce.',
    prepTime: '30min',
    cookCount: 1,
    ingredients: ['500g Potatoes', '1 Onion', 'Herbs'],
    steps: ['Slice potatoes.', 'Pan fry until crisp.', 'Finish with herbs and seasoning.'],
    likes: 54,
  },
  {
    title: 'Vegetable rice bowl',
    description: 'A light bowl with rice, roasted vegetables and a bright dressing.',
    prepTime: '25min',
    cookCount: 1,
    ingredients: ['150g Rice', '1 Zucchini', '1 Carrot'],
    steps: ['Cook rice.', 'Roast vegetables.', 'Assemble bowl and dress before serving.'],
    likes: 42,
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
  protected readonly likedRecipes = COOKBOOK_FALLBACK_RECIPES;
  protected readonly cuisineCategories = COOKBOOK_CUISINE_CATEGORIES;

  protected openRecipe(recipe: GeneratedRecipe): void {
    this.recipeGeneration.selectRecipe(recipe);
    void this.router.navigate(['/preparation'], { queryParams: { from: 'cookbook' } });
  }
}

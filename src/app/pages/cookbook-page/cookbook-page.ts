import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GeneratedRecipe } from '../../services/recipe-generation.service';

type CookbookLikedRecipe = GeneratedRecipe & {
  likes: number;
};

const COOKBOOK_FALLBACK_RECIPES: CookbookLikedRecipe[] = [
  {
    title: 'Pasta with spinach and cherry tommatoes',
    description: 'A creamy weeknight pasta with fresh greens and a fast tomato finish.',
    prepTime: '20min',
    ingredients: ['80g Pasta noodles', '100g Baby spinach', '150g Cherry tomatoes'],
    steps: ['Boil pasta.', 'Cook tomatoes and spinach.', 'Fold everything together and serve.'],
    likes: 66,
  },
  {
    title: 'Crispy potato skillet',
    description: 'Golden potatoes with herbs, onion and a quick pan sauce.',
    prepTime: '30min',
    ingredients: ['500g Potatoes', '1 Onion', 'Herbs'],
    steps: ['Slice potatoes.', 'Pan fry until crisp.', 'Finish with herbs and seasoning.'],
    likes: 54,
  },
  {
    title: 'Vegetable rice bowl',
    description: 'A light bowl with rice, roasted vegetables and a bright dressing.',
    prepTime: '25min',
    ingredients: ['150g Rice', '1 Zucchini', '1 Carrot'],
    steps: ['Cook rice.', 'Roast vegetables.', 'Assemble bowl and dress before serving.'],
    likes: 42,
  },
];

@Component({
  selector: 'app-cookbook-page',
  imports: [RouterLink],
  templateUrl: './cookbook-page.html',
  styleUrl: './cookbook-page.scss',
})
export class CookbookPageComponent {
  protected readonly likedRecipes = COOKBOOK_FALLBACK_RECIPES;
}

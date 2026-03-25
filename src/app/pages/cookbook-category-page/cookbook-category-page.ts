import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GeneratedRecipe, RecipeGenerationService } from '../../services/recipe-generation.service';

type CookbookCategoryRecipe = GeneratedRecipe & {
  likes: number;
};

type CookbookCategoryConfig = {
  slug: string;
  title: string;
  heroSrc: string;
  recipes: CookbookCategoryRecipe[];
};

const COOKBOOK_CATEGORY_CONFIGS: CookbookCategoryConfig[] = [
  {
    slug: 'italian',
    title: 'Italian cuisine',
    heroSrc: '/Icons/Property 1=Italian.svg',
    recipes: [
      {
        title: 'Pasta with spinach and cherry tommatoes',
        description: 'A creamy weeknight pasta with fresh greens and a fast tomato finish.',
        prepTime: '20min',
        ingredients: ['80g Pasta noodles', '100g Baby spinach', '150g Cherry tomatoes'],
        steps: ['Boil pasta.', 'Cook tomatoes and spinach.', 'Fold everything together and serve.'],
        likes: 66,
      },
      {
        title: 'Creamy mushroom linguine',
        description: 'Silky pasta with mushrooms, garlic and parmesan.',
        prepTime: '25min',
        ingredients: ['Linguine', 'Mushrooms', 'Parmesan'],
        steps: ['Cook pasta.', 'Saute mushrooms.', 'Combine and finish.'],
        likes: 58,
      },
    ],
  },
  {
    slug: 'german',
    title: 'German cuisine',
    heroSrc: '/Icons/Property 1=German.svg',
    recipes: [
      {
        title: 'Crispy potato skillet',
        description: 'Golden potatoes with herbs, onion and a quick pan sauce.',
        prepTime: '30min',
        ingredients: ['500g Potatoes', '1 Onion', 'Herbs'],
        steps: ['Slice potatoes.', 'Pan fry until crisp.', 'Finish with herbs and seasoning.'],
        likes: 54,
      },
      {
        title: 'Pretzel schnitzel plate',
        description: 'A hearty German-style dinner with crisp textures.',
        prepTime: '35min',
        ingredients: ['Pretzel', 'Cutlet', 'Cabbage'],
        steps: ['Prepare sides.', 'Cook schnitzel.', 'Plate and serve.'],
        likes: 49,
      },
    ],
  },
  {
    slug: 'japanese',
    title: 'Japanese cuisine',
    heroSrc: '/Icons/Property 1=Japanese.svg',
    recipes: [
      {
        title: 'Vegetable rice bowl',
        description: 'A light bowl with rice, roasted vegetables and a bright dressing.',
        prepTime: '25min',
        ingredients: ['150g Rice', '1 Zucchini', '1 Carrot'],
        steps: ['Cook rice.', 'Roast vegetables.', 'Assemble bowl and dress before serving.'],
        likes: 42,
      },
      {
        title: 'Salmon nigiri plate',
        description: 'A clean, balanced sushi plate with bright flavors.',
        prepTime: '30min',
        ingredients: ['Rice', 'Salmon', 'Soy'],
        steps: ['Season rice.', 'Slice salmon.', 'Assemble nigiri.'],
        likes: 61,
      },
    ],
  },
  {
    slug: 'gourmet',
    title: 'Gourmet cuisine',
    heroSrc: '/Icons/Property 1=Gourmet.svg',
    recipes: [
      {
        title: 'Seared duck with spring vegetables',
        description: 'Plated with finesse and a glossy reduction.',
        prepTime: '40min',
        ingredients: ['Duck', 'Asparagus', 'Sauce'],
        steps: ['Sear duck.', 'Cook vegetables.', 'Plate carefully.'],
        likes: 52,
      },
      {
        title: 'Truffle potato mille-feuille',
        description: 'Layered, crisp and rich with truffle notes.',
        prepTime: '45min',
        ingredients: ['Potato', 'Cream', 'Truffle'],
        steps: ['Layer potatoes.', 'Bake until crisp.', 'Finish and serve.'],
        likes: 47,
      },
    ],
  },
  {
    slug: 'indian',
    title: 'Indian cuisine',
    heroSrc: '/Icons/Property 1=Indian.svg',
    recipes: [
      {
        title: 'Paneer masala thali',
        description: 'A full plate with spices, rice and warm flatbread.',
        prepTime: '35min',
        ingredients: ['Paneer', 'Rice', 'Naan'],
        steps: ['Cook curry.', 'Prepare rice.', 'Serve as a thali.'],
        likes: 56,
      },
      {
        title: 'Golden dal bowl',
        description: 'Comforting lentils with fragrant tempering.',
        prepTime: '30min',
        ingredients: ['Lentils', 'Spices', 'Rice'],
        steps: ['Simmer lentils.', 'Temper spices.', 'Serve warm.'],
        likes: 44,
      },
    ],
  },
  {
    slug: 'fusion',
    title: 'Fusion cuisine',
    heroSrc: '/Icons/Property 1=Fusion.svg',
    recipes: [
      {
        title: 'Fusion sushi tasting plate',
        description: 'A modern plate with playful colors and shapes.',
        prepTime: '30min',
        ingredients: ['Rice', 'Salmon', 'Peas'],
        steps: ['Prepare rice.', 'Assemble tasting pieces.', 'Plate with sauces.'],
        likes: 63,
      },
      {
        title: 'Korean taco bowl',
        description: 'Savory, bright and layered with crunchy toppings.',
        prepTime: '25min',
        ingredients: ['Rice', 'Beef', 'Kimchi'],
        steps: ['Cook filling.', 'Prepare toppings.', 'Assemble bowl.'],
        likes: 51,
      },
    ],
  },
];

@Component({
  selector: 'app-cookbook-category-page',
  imports: [RouterLink],
  templateUrl: './cookbook-category-page.html',
  styleUrl: './cookbook-category-page.scss',
})
export class CookbookCategoryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipeGeneration = inject(RecipeGenerationService);

  protected readonly category = computed(() => {
    const slug = this.route.snapshot.paramMap.get('category') ?? '';

    return COOKBOOK_CATEGORY_CONFIGS.find((entry) => entry.slug === slug) ?? COOKBOOK_CATEGORY_CONFIGS[0];
  });

  protected openRecipe(recipe: GeneratedRecipe): void {
    this.recipeGeneration.selectRecipe(recipe);
    void this.router.navigate(['/preparation'], { queryParams: { from: 'cookbook' } });
  }
}

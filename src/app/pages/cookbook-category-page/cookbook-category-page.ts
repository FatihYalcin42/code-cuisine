import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GeneratedRecipe, RecipeGenerationService } from '../../services/recipe-generation.service';

type CookbookCategoryRecipe = GeneratedRecipe & {
  likes: number;
  badges: string[];
};

type CookbookCategoryConfig = {
  slug: string;
  title: string;
  heroSrc: string;
  mobileHeroSrc: string;
  recipes: CookbookCategoryRecipe[];
};

const PAGE_SIZE = 10;
const DEFAULT_CATEGORY = {
  slug: 'italian',
  title: 'Italian cuisine',
  heroSrc: '/Icons/Property 1=Italian.svg',
  mobileHeroSrc: '/Icons/Property 1=Italian-mobile.svg',
  recipes: [],
} satisfies CookbookCategoryConfig;

function repeatRecipes(recipes: CookbookCategoryRecipe[], total: number): CookbookCategoryRecipe[] {
  return Array.from({ length: total }, (_, index) => {
    const recipe = recipes[index % recipes.length];

    return {
      ...recipe,
      ingredients: [...recipe.ingredients],
      steps: [...recipe.steps],
      badges: [...recipe.badges],
    };
  });
}

const COOKBOOK_CATEGORY_CONFIGS: CookbookCategoryConfig[] = [
  {
    slug: 'italian',
    title: 'Italian cuisine',
    heroSrc: '/Icons/Property 1=Italian.svg',
    mobileHeroSrc: '/Icons/Property 1=Italian-mobile.svg',
    recipes: repeatRecipes([
      {
        title: 'Pasta with spinach and cherry tommatoes',
        description: 'A creamy weeknight pasta with fresh greens and a fast tomato finish.',
        prepTime: '20min',
        ingredients: ['80g Pasta noodles', '100g Baby spinach', '150g Cherry tomatoes'],
        steps: ['Boil pasta.', 'Cook tomatoes and spinach.', 'Fold everything together and serve.'],
        likes: 66,
        badges: ['Vegetarian', 'Quick'],
      },
      {
        title: 'Creamy garlic shrimp pasta',
        description: 'Silky pasta with shrimp, garlic and parmesan.',
        prepTime: '22min',
        ingredients: ['Linguine', 'Shrimp', 'Parmesan'],
        steps: ['Cook pasta.', 'Saute shrimp.', 'Combine and finish.'],
        likes: 32,
        badges: ['Quick'],
      },
      {
        title: 'Funghi salami pizza',
        description: 'Crisp pizza topped with mushrooms, salami and herbs.',
        prepTime: '16min',
        ingredients: ['Pizza dough', 'Mushrooms', 'Salami'],
        steps: ['Shape dough.', 'Top pizza.', 'Bake and slice.'],
        likes: 42,
        badges: ['Quick'],
      },
    ], 15),
  },
  {
    slug: 'german',
    title: 'German cuisine',
    heroSrc: '/Icons/Property 1=German.svg',
    mobileHeroSrc: '/Icons/Property 1=German-mobile.svg',
    recipes: repeatRecipes([
      {
        title: 'Crispy potato skillet',
        description: 'Golden potatoes with herbs, onion and a quick pan sauce.',
        prepTime: '30min',
        ingredients: ['500g Potatoes', '1 Onion', 'Herbs'],
        steps: ['Slice potatoes.', 'Pan fry until crisp.', 'Finish with herbs and seasoning.'],
        likes: 54,
        badges: ['Quick'],
      },
      {
        title: 'Pretzel schnitzel plate',
        description: 'A hearty German-style dinner with crisp textures.',
        prepTime: '35min',
        ingredients: ['Pretzel', 'Cutlet', 'Cabbage'],
        steps: ['Prepare sides.', 'Cook schnitzel.', 'Plate and serve.'],
        likes: 49,
        badges: ['Gourmet'],
      },
    ], 15),
  },
  {
    slug: 'japanese',
    title: 'Japanese cuisine',
    heroSrc: '/Icons/Property 1=Japanese.svg',
    mobileHeroSrc: '/Icons/Property 1=Japanese-mobile.svg',
    recipes: repeatRecipes([
      {
        title: 'Vegetable rice bowl',
        description: 'A light bowl with rice, roasted vegetables and a bright dressing.',
        prepTime: '25min',
        ingredients: ['150g Rice', '1 Zucchini', '1 Carrot'],
        steps: ['Cook rice.', 'Roast vegetables.', 'Assemble bowl and dress before serving.'],
        likes: 42,
        badges: ['Vegetarian', 'Quick'],
      },
      {
        title: 'Salmon nigiri plate',
        description: 'A clean, balanced sushi plate with bright flavors.',
        prepTime: '30min',
        ingredients: ['Rice', 'Salmon', 'Soy'],
        steps: ['Season rice.', 'Slice salmon.', 'Assemble nigiri.'],
        likes: 61,
        badges: ['Quick'],
      },
    ], 15),
  },
  {
    slug: 'gourmet',
    title: 'Gourmet cuisine',
    heroSrc: '/Icons/Property 1=Gourmet.svg',
    mobileHeroSrc: '/Icons/Property 1=Gourmet-mobile.svg',
    recipes: repeatRecipes([
      {
        title: 'Seared duck with spring vegetables',
        description: 'Plated with finesse and a glossy reduction.',
        prepTime: '40min',
        ingredients: ['Duck', 'Asparagus', 'Sauce'],
        steps: ['Sear duck.', 'Cook vegetables.', 'Plate carefully.'],
        likes: 52,
        badges: ['Gourmet'],
      },
      {
        title: 'Truffle potato mille-feuille',
        description: 'Layered, crisp and rich with truffle notes.',
        prepTime: '45min',
        ingredients: ['Potato', 'Cream', 'Truffle'],
        steps: ['Layer potatoes.', 'Bake until crisp.', 'Finish and serve.'],
        likes: 47,
        badges: ['Vegetarian'],
      },
    ], 15),
  },
  {
    slug: 'indian',
    title: 'Indian cuisine',
    heroSrc: '/Icons/Property 1=Indian.svg',
    mobileHeroSrc: '/Icons/Property 1=Indian-mobile.svg',
    recipes: repeatRecipes([
      {
        title: 'Paneer masala thali',
        description: 'A full plate with spices, rice and warm flatbread.',
        prepTime: '35min',
        ingredients: ['Paneer', 'Rice', 'Naan'],
        steps: ['Cook curry.', 'Prepare rice.', 'Serve as a thali.'],
        likes: 56,
        badges: ['Vegetarian'],
      },
      {
        title: 'Golden dal bowl',
        description: 'Comforting lentils with fragrant tempering.',
        prepTime: '30min',
        ingredients: ['Lentils', 'Spices', 'Rice'],
        steps: ['Simmer lentils.', 'Temper spices.', 'Serve warm.'],
        likes: 44,
        badges: ['Vegetarian', 'Quick'],
      },
    ], 15),
  },
  {
    slug: 'fusion',
    title: 'Fusion cuisine',
    heroSrc: '/Icons/Property 1=Fusion.svg',
    mobileHeroSrc: '/Icons/Property 1=Fusion-mobile.svg',
    recipes: repeatRecipes([
      {
        title: 'Fusion sushi tasting plate',
        description: 'A modern plate with playful colors and shapes.',
        prepTime: '30min',
        ingredients: ['Rice', 'Salmon', 'Peas'],
        steps: ['Prepare rice.', 'Assemble tasting pieces.', 'Plate with sauces.'],
        likes: 63,
        badges: ['Gourmet'],
      },
      {
        title: 'Korean taco bowl',
        description: 'Savory, bright and layered with crunchy toppings.',
        prepTime: '25min',
        ingredients: ['Rice', 'Beef', 'Kimchi'],
        steps: ['Cook filling.', 'Prepare toppings.', 'Assemble bowl.'],
        likes: 51,
        badges: ['Quick'],
      },
    ], 15),
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
  private readonly paramMap = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly pageSize = PAGE_SIZE;

  protected readonly category = computed<CookbookCategoryConfig>(() => {
    const slug = this.paramMap().get('category') ?? '';

    const matchingCategory = COOKBOOK_CATEGORY_CONFIGS.find((entry) => entry.slug === slug);

    return matchingCategory ?? COOKBOOK_CATEGORY_CONFIGS[0] ?? DEFAULT_CATEGORY;
  });

  protected readonly currentPage = computed(() => {
    const rawPage = Number(this.queryParamMap().get('page') ?? '1');
    const page = Number.isFinite(rawPage) ? Math.floor(rawPage) : 1;
    return Math.max(1, Math.min(page, this.totalPages()));
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.category().recipes.length / PAGE_SIZE)));

  protected readonly visibleRecipes = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.category().recipes.slice(start, start + PAGE_SIZE);
  });

  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  protected openRecipe(recipe: GeneratedRecipe): void {
    this.recipeGeneration.selectRecipe(recipe);
    void this.router.navigate(['/preparation'], { queryParams: { from: 'cookbook' } });
  }

  protected recipeNumber(indexOnPage: number): number {
    return (this.currentPage() - 1) * PAGE_SIZE + indexOnPage + 1;
  }

  protected changePage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }
}

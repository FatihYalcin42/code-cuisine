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
        cookCount: 2,
        ingredients: ['80g Pasta noodles', '100g Baby spinach', '150g Cherry tomatoes'],
        steps: [
          'Bring a pot of salted water to a boil and cook the pasta until al dente. Reserve a little pasta water before draining.',
          'Heat olive oil in a pan and cook the cherry tomatoes until they soften and begin to burst. Add the spinach and stir until it just wilts.',
          'Add the drained pasta to the pan and toss everything together until glossy. Use a splash of pasta water if needed, then season and serve warm.',
        ],
        likes: 66,
        badges: ['Vegetarian', 'Quick'],
      },
      {
        title: 'Creamy garlic shrimp pasta',
        description: 'Silky pasta with shrimp, garlic and parmesan.',
        prepTime: '22min',
        cookCount: 3,
        ingredients: ['Linguine', 'Shrimp', 'Parmesan'],
        steps: [
          'Cook the linguine in salted water until just al dente, then drain it while keeping a little of the cooking water aside. This helps the final sauce come together smoothly.',
          'Saute the shrimp with garlic in a hot pan until they turn pink and lightly golden. Do not overcook them, or they will lose their tender texture.',
          'Add the pasta to the pan and toss it with the shrimp and grated parmesan. Finish with a splash of pasta water to make the sauce silky before serving.',
        ],
        likes: 32,
        badges: ['Quick'],
      },
      {
        title: 'Funghi salami pizza',
        description: 'Crisp pizza topped with mushrooms, salami and herbs.',
        prepTime: '16min',
        cookCount: 1,
        ingredients: ['Pizza dough', 'Mushrooms', 'Salami'],
        steps: [
          'Stretch the pizza dough on a floured surface until it is evenly thin. Make sure the edges stay slightly thicker so they bake up nicely.',
          'Top the dough with mushrooms, salami and your sauce or seasoning. Spread everything evenly so the pizza cooks without soggy spots.',
          'Bake the pizza until the crust is golden and the topping is bubbling. Let it rest briefly, then slice and serve.',
        ],
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
        cookCount: 1,
        ingredients: ['500g Potatoes', '1 Onion', 'Herbs'],
        steps: [
          'Wash the potatoes well and slice them into even pieces so they cook at the same speed. Slice the onion finely and keep it ready for the pan.',
          'Cook the potatoes in a hot pan with oil until they are crisp on the outside and soft in the middle. Add the onion partway through so it softens without getting too dark.',
          'Finish with herbs, salt and pepper, then toss everything together. Let the skillet rest for a minute before serving so the flavors settle.',
        ],
        likes: 54,
        badges: ['Quick'],
      },
      {
        title: 'Pretzel schnitzel plate',
        description: 'A hearty German-style dinner with crisp textures.',
        prepTime: '35min',
        cookCount: 3,
        ingredients: ['Pretzel', 'Cutlet', 'Cabbage'],
        steps: [
          'Prepare the cabbage and pretzel side first so everything is ready when the schnitzel finishes. Keep the side warm while you work on the main component.',
          'Cook the schnitzel until the coating is crisp and deeply golden. The inside should stay juicy, so avoid pressing it down in the pan.',
          'Arrange the schnitzel with the sides on warm plates. Add any finishing seasoning or garnish just before serving.',
        ],
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
        cookCount: 1,
        ingredients: ['150g Rice', '1 Zucchini', '1 Carrot'],
        steps: [
          'Cook the rice until tender and fluffy, then keep it covered so it stays warm. This gives you time to prepare the vegetables without the rice drying out.',
          'Roast or saute the zucchini and carrot until they are lightly browned and just tender. Season them while hot so the flavor clings better.',
          'Fill a bowl with rice and arrange the vegetables neatly on top. Add the dressing or final seasoning right before serving.',
        ],
        likes: 42,
        badges: ['Vegetarian', 'Quick'],
      },
      {
        title: 'Salmon nigiri plate',
        description: 'A clean, balanced sushi plate with bright flavors.',
        prepTime: '30min',
        cookCount: 2,
        ingredients: ['Rice', 'Salmon', 'Soy'],
        steps: [
          'Prepare and season the rice, then let it cool slightly so it is easy to shape. The rice should stay sticky but not hot.',
          'Slice the salmon into even pieces so each bite looks clean and balanced. Use a sharp knife and smooth motions for the best result.',
          'Shape the rice and place the salmon on top to form the nigiri. Serve with soy or your chosen accompaniments.',
        ],
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
        cookCount: 4,
        ingredients: ['Duck', 'Asparagus', 'Sauce'],
        steps: [
          'Score and sear the duck carefully so the skin renders and becomes crisp. Let it cook steadily so the fat melts without burning.',
          'Cook the vegetables separately until tender but still vibrant. Keep the sauce warm and glossy so it is ready for plating.',
          'Slice the duck and arrange all components with care on the plate. Spoon over the sauce at the end for a clean finish.',
        ],
        likes: 52,
        badges: ['Gourmet'],
      },
      {
        title: 'Truffle potato mille-feuille',
        description: 'Layered, crisp and rich with truffle notes.',
        prepTime: '45min',
        cookCount: 3,
        ingredients: ['Potato', 'Cream', 'Truffle'],
        steps: [
          'Slice the potatoes very thinly and layer them neatly with cream in the baking dish. Even layers help the dish cook uniformly and hold its shape.',
          'Bake until the layers are tender inside and lightly crisp on top. Give it enough time so the center sets properly.',
          'Finish with truffle and any final seasoning just before serving. Slice carefully so the layers stay intact on the plate.',
        ],
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
        cookCount: 3,
        ingredients: ['Paneer', 'Rice', 'Naan'],
        steps: [
          'Cook the curry base until the spices are fragrant and fully opened up. Add the paneer at the right moment so it stays soft and flavorful.',
          'Prepare the rice and warm the naan while the curry simmers. Timing the sides well keeps the full plate balanced and hot.',
          'Serve everything together as a thali with the components arranged neatly. Add fresh garnish or extra seasoning at the end if needed.',
        ],
        likes: 56,
        badges: ['Vegetarian'],
      },
      {
        title: 'Golden dal bowl',
        description: 'Comforting lentils with fragrant tempering.',
        prepTime: '30min',
        cookCount: 2,
        ingredients: ['Lentils', 'Spices', 'Rice'],
        steps: [
          'Simmer the lentils until they are soft and creamy but still hold some structure. Stir occasionally so they do not catch on the bottom.',
          'Prepare the spice tempering separately so the flavors bloom fully in the hot fat. Pour it over the lentils while still hot for the best aroma.',
          'Serve the dal warm with rice or your chosen side. Finish with herbs or a final spoon of tempering if you want more depth.',
        ],
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
        cookCount: 4,
        ingredients: ['Rice', 'Salmon', 'Peas'],
        steps: [
          'Prepare the rice and let it cool to the right texture for shaping. It should be seasoned but still neutral enough to pair with the toppings.',
          'Assemble the tasting pieces carefully so each one has a distinct look and balance. Work neatly to keep the plate elegant and playful.',
          'Finish the plate with sauces and garnish placed with intention. Serve immediately while the textures are still fresh.',
        ],
        likes: 63,
        badges: ['Gourmet'],
      },
      {
        title: 'Korean taco bowl',
        description: 'Savory, bright and layered with crunchy toppings.',
        prepTime: '25min',
        cookCount: 2,
        ingredients: ['Rice', 'Beef', 'Kimchi'],
        steps: [
          'Cook the filling until it is well browned and full of flavor. Keep it slightly saucy so it coats the rest of the bowl nicely.',
          'Prepare the toppings while the filling cooks so everything is ready at the same time. Balance crunchy, fresh and spicy elements for contrast.',
          'Assemble the bowl with rice at the base and the toppings layered on top. Serve immediately so the textures stay distinct.',
        ],
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

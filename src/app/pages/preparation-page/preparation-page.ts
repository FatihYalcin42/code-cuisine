import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  GeneratedRecipe,
  RecipeGenerationService,
} from '../../services/recipe-generation.service';

const PREPARATION_PAGE_FALLBACK_RECIPE: GeneratedRecipe = {
  title: 'Pasta with spinach and cherry tommatoes',
  description:
    'A creamy weeknight pasta with baby spinach, sweet cherry tomatoes and a fast stovetop finish.',
  prepTime: '20min',
  ingredients: [
    '80g Pasta noodles',
    '100g Baby spinach',
    '150g Cherry tomatoes',
    '1 piece Egg',
    '40g Parmesan cheese',
    '30ml Olive oil',
    'Herbs (dry basil, oregano, garlic)',
  ],
  steps: [
    'Boil the pasta in salted water until al dente and keep a little cooking water.',
    'Warm olive oil in a pan, then soften the cherry tomatoes until they start to burst.',
    'Add spinach and herbs, fold in the pasta and loosen the sauce with a splash of pasta water.',
    'Finish with egg and parmesan off the heat, then season and serve immediately.',
  ],
};

const PREPARATION_PAGE_FALLBACK_PERSONS = 2;
const PREPARATION_PAGE_FALLBACK_NUTRITION_FACTS = [
  { label: 'Energie', value: '630 kcal' },
  { label: 'Protein', value: '18g' },
  { label: 'Fat', value: '24g' },
  { label: 'Carbs', value: '58g' },
];
const PREPARATION_PAGE_FALLBACK_STEP_TITLES = [
  'Cook the pasta',
  'Make the sauce',
  'Finish the pasta',
  'Plate and serve',
];

@Component({
  selector: 'app-preparation-page',
  imports: [RouterLink],
  templateUrl: './preparation-page.html',
  styleUrl: './preparation-page.scss',
})
export class PreparationPageComponent {
  private readonly recipeGeneration = inject(RecipeGenerationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly source = this.route.snapshot.queryParamMap.get('from');
  protected readonly isLiked = signal(false);
  protected readonly ingredientsCollapsed = signal(false);
  protected readonly directionsCollapsed = signal(false);
  protected readonly isMobileLayout = signal(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false,
  );
  private readonly cookingPersons = computed(
    () => Math.max(1, this.recipeGeneration.lastUsedPreferences()?.persons ?? PREPARATION_PAGE_FALLBACK_PERSONS),
  );
  protected readonly selectedRecipe = computed(
    () =>
      this.recipeGeneration.selectedRecipe() ??
      this.recipeGeneration.generatedRecipes()[0] ??
      PREPARATION_PAGE_FALLBACK_RECIPE,
  );
  protected readonly backLinkLabel = this.source === 'cookbook' ? 'Back to cookbook' : 'Recipe results';
  protected readonly backLinkTarget = this.source === 'cookbook' ? '/cookbook' : '/results';
  protected readonly backLinkAriaLabel =
    this.source === 'cookbook' ? 'Back to cookbook' : 'Back to recipe results';
  protected readonly selectedPreferenceTags = computed(() => {
    const preferences = this.recipeGeneration.lastUsedPreferences();

    if (!preferences) {
      return ['Vegetarian', 'Quick'];
    }

    return [preferences.diet, preferences.cookingTime, preferences.cuisine]
      .filter((value): value is string => Boolean(value && value !== 'No preferences'))
      .map((value) => value.trim());
  });
  protected readonly nutritionFacts = computed(() => {
    const recipeTitle = this.selectedRecipe()?.title.toLowerCase() ?? '';

    if (recipeTitle.includes('potato')) {
      return [
        { label: 'Energie', value: '540 kcal' },
        { label: 'Protein', value: '11g' },
        { label: 'Fat', value: '19g' },
        { label: 'Carbs', value: '73g' },
      ];
    }

    if (recipeTitle.includes('rice bowl')) {
      return [
        { label: 'Energie', value: '510 kcal' },
        { label: 'Protein', value: '14g' },
        { label: 'Fat', value: '16g' },
        { label: 'Carbs', value: '68g' },
      ];
    }

    return PREPARATION_PAGE_FALLBACK_NUTRITION_FACTS;
  });
  protected readonly cookingPersonsLabel = computed(() => this.cookingPersons());
  protected readonly cookLabelSources = computed(() => {
    const availableCookLabels = [
      '/Icons/Cook-label.svg',
      '/Icons/Cook-label2.svg',
      '/Icons/cook-label3.svg',
      '/Icons/Cook-label4.svg',
    ];

    return availableCookLabels.slice(0, Math.min(this.cookingPersons(), availableCookLabels.length));
  });
  protected readonly preparationDirections = computed(() => {
    const recipe = this.selectedRecipe();

    return (recipe?.steps ?? []).map((step, index) => ({
      number: index + 1,
      title: PREPARATION_PAGE_FALLBACK_STEP_TITLES[index] ?? `Step ${index + 1}`,
      text: step,
      cookLabelSource: index % 2 === 0 ? '/Icons/Cook-label.svg' : '/Icons/Cook-label2.svg',
    }));
  });
  protected readonly ingredientColumns = computed(() => {
    const ingredients = this.selectedRecipe()?.ingredients ?? [];
    const splitIndex = Math.min(4, Math.ceil(ingredients.length / 2));

    return {
      yourIngredients: ingredients.slice(0, splitIndex),
      extraIngredients: ingredients.slice(splitIndex),
    };
  });

  constructor() {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(max-width: 768px)');
      const updateMobileLayout = (event: MediaQueryList | MediaQueryListEvent): void => {
        this.isMobileLayout.set(event.matches);
      };

      updateMobileLayout(mediaQuery);
      mediaQuery.addEventListener('change', updateMobileLayout);

      this.destroyRef.onDestroy(() => {
        mediaQuery.removeEventListener('change', updateMobileLayout);
      });
    }

    effect(() => {
      const recipe = this.selectedRecipe();

      if (!recipe || typeof window === 'undefined') {
        this.isLiked.set(false);
        return;
      }

      this.isLiked.set(window.localStorage.getItem(this.getLikedRecipeStorageKey(recipe.title)) === 'true');
    });
  }

  protected toggleLike(): void {
    const recipe = this.selectedRecipe();

    if (!recipe) {
      return;
    }

    const nextValue = !this.isLiked();
    this.isLiked.set(nextValue);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.getLikedRecipeStorageKey(recipe.title), String(nextValue));
    }
  }

  protected toggleIngredients(): void {
    this.ingredientsCollapsed.update((value) => !value);
  }

  protected toggleDirections(): void {
    this.directionsCollapsed.update((value) => !value);
  }

  private getLikedRecipeStorageKey(recipeTitle: string): string {
    return `liked-recipe:${recipeTitle.trim().toLowerCase()}`;
  }
}

import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../../services/recipe-generation.service';
import { CookbookStoreService } from '../../services/cookbook-store.service';
import { GeneratedRecipe } from '../../models/recipe.model';

const AVAILABLE_COOK_LABELS = [
  '/Icons/Cook-label.svg',
  '/Icons/Cook-label2.svg',
  '/Icons/cook-label3.svg',
  '/Icons/Cook-label4.svg',
];

@Component({
  selector: 'app-preparation-page',
  imports: [RouterLink],
  templateUrl: './preparation-page.html',
  styleUrl: './preparation-page.scss',
})
export class PreparationPageComponent {
  private readonly recipeGeneration = inject(RecipeGenerationService);
  private readonly cookbookStore = inject(CookbookStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly source = this.route.snapshot.queryParamMap.get('from');
  /** Tracks whether the current recipe has been liked locally by this browser. */
  protected readonly isLiked = signal(false);
  /** Stores the mobile accordion state for the ingredient section. */
  protected readonly ingredientsCollapsed = signal(false);
  /** Stores the mobile accordion state for the directions section. */
  protected readonly directionsCollapsed = signal(false);
  /** Mirrors the active responsive breakpoint used by the preparation layout. */
  protected readonly isMobileLayout = signal(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false,
  );
  /** Resolves how many cook labels should be shown for the current recipe. */
  private readonly cookingPersons = computed(
    () =>
      Math.max(
        1,
        this.selectedRecipe()?.cookCount ??
          this.recipeGeneration.lastUsedPreferences()?.persons ??
          1,
      ),
  );
  /** Selects the active recipe either from the explicit selection or the latest generated result list. */
  protected readonly selectedRecipe = computed(
    () => this.recipeGeneration.selectedRecipe() ?? this.recipeGeneration.generatedRecipes()[0] ?? null,
  );
  protected readonly backLinkLabel = this.source === 'cookbook' ? 'Back to cookbook' : 'Recipe results';
  protected readonly backLinkTarget = this.source === 'cookbook' ? '/cookbook' : '/results';
  protected readonly backLinkAriaLabel =
    this.source === 'cookbook' ? 'Back to cookbook' : 'Back to recipe results';
  /** Builds the visible preference tags from the current recipe and the last submitted request. */
  protected readonly selectedPreferenceTags = computed(() => {
    const preferences = this.recipeGeneration.lastUsedPreferences();
    const recipe = this.selectedRecipe();
    const tags: string[] = [];

    if (recipe?.dietTag) {
      tags.push(recipe.dietTag);
    }

    tags.push(getCookingTimeCategory(recipe?.prepTime ?? ''));

    if (!preferences) {
      return tags;
    }

    const cuisine = preferences.cuisine?.trim();

    if (cuisine && cuisine !== 'No preferences') {
      tags.push(cuisine);
    }

    return tags;
  });
  /** Formats nutritional values for the preparation sidebar without inventing fallback recipe data. */
  protected readonly nutritionFacts = computed(() => {
    const recipeNutrition = this.selectedRecipe()?.nutrition?.perPortion;

    if (recipeNutrition) {
      return [
        { label: 'Energie', value: formatNutritionValue(recipeNutrition.calories, 'kcal') },
        { label: 'Protein', value: formatNutritionValue(recipeNutrition.protein_g, 'g') },
        { label: 'Fat', value: formatNutritionValue(recipeNutrition.fat_g, 'g') },
        { label: 'Carbs', value: formatNutritionValue(recipeNutrition.carbs_g, 'g') },
      ];
    }

    return [
      { label: 'Energie', value: '-- kcal' },
      { label: 'Protein', value: '-- g' },
      { label: 'Fat', value: '-- g' },
      { label: 'Carbs', value: '-- g' },
    ];
  });
  /** Exposes the formatted cook count for the header area. */
  protected readonly cookingPersonsLabel = computed(() => this.cookingPersons());
  /** Limits the visible cook labels to the number of active cooks. */
  protected readonly cookLabelSources = computed(() => {
    return AVAILABLE_COOK_LABELS.slice(0, Math.min(this.cookingPersons(), AVAILABLE_COOK_LABELS.length));
  });
  /** Maps the raw recipe step text into display rows without altering the original instructions. */
  protected readonly preparationDirections = computed(() => {
    const recipe = this.selectedRecipe();
    const activeCookLabels = this.cookLabelSources();

    return (recipe?.steps ?? []).map((step, index) => ({
      number: index + 1,
      title: `Step ${index + 1}`,
      text: step.trim(),
      cookLabelSource: activeCookLabels[index % activeCookLabels.length] ?? AVAILABLE_COOK_LABELS[0],
    }));
  });
  /** Splits the ingredient display into user-provided and extra ingredients. */
  protected readonly ingredientColumns = computed(() => {
    const recipe = this.selectedRecipe();
    const userIngredients = recipe?.userIngredients;
    const extraIngredients = recipe?.extraIngredients;

    if (userIngredients || extraIngredients) {
      return {
        yourIngredients: userIngredients ?? [],
        extraIngredients: extraIngredients ?? [],
      };
    }

    const ingredients = recipe?.ingredients ?? [];
    const splitIndex = Math.min(4, Math.ceil(ingredients.length / 2));

    return {
      yourIngredients: ingredients.slice(0, splitIndex),
      extraIngredients: ingredients.slice(splitIndex),
    };
  });

  /** Registers resize listeners and restores the persisted like state for the active recipe. */
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

  /** Toggles the liked state for the currently selected recipe and persists the like in Firestore. */
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

    if (nextValue) {
      void this.cookbookStore.likeRecipe(recipe);
    }
  }

  /** Toggles the mobile ingredient accordion. */
  protected toggleIngredients(): void {
    this.ingredientsCollapsed.update((value) => !value);
  }

  /** Toggles the mobile directions accordion. */
  protected toggleDirections(): void {
    this.directionsCollapsed.update((value) => !value);
  }

  /** Builds the localStorage key used to remember whether a recipe was liked. */
  private getLikedRecipeStorageKey(recipeTitle: string): string {
    return `liked-recipe:${recipeTitle.trim().toLowerCase()}`;
  }
}
/** Maps a raw preparation time string to the three UI-facing time categories. */
function getCookingTimeCategory(prepTime: string): 'Quick' | 'Medium' | 'Complex' {
  const minutes = Number.parseInt(prepTime.replace(/\D/g, ''), 10);

  if (Number.isNaN(minutes) || minutes <= 20) {
    return 'Quick';
  }

  if (minutes <= 45) {
    return 'Medium';
  }

  return 'Complex';
}

/** Formats nutrition values for display while keeping missing values explicit. */
function formatNutritionValue(value: number | null, unit: string): string {
  if (value === null || Number.isNaN(value)) {
    return `-- ${unit}`;
  }

  return `${value}${unit}`;
}

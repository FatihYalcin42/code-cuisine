import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecipeGenerationService } from '../../services/recipe-generation.service';
import { CookbookStoreService } from '../../services/cookbook-store.service';
import { GeneratedRecipe, type RecipeNutrition } from '../../models/recipe.model';

const AVAILABLE_COOK_LABELS = [
  'Icons/Cook-label.svg',
  'Icons/Cook-label2.svg',
  'Icons/cook-label3.svg',
  'Icons/Cook-label4.svg',
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
  protected readonly selectedPreferenceTags = computed(() =>
    buildPreparationPreferenceTags(
      this.selectedRecipe(),
      this.recipeGeneration.lastUsedPreferences(),
    ),
  );
  /** Formats nutritional values for the preparation sidebar without inventing fallback recipe data. */
  protected readonly nutritionFacts = computed(() =>
    buildNutritionFacts(this.selectedRecipe()?.nutrition?.perPortion ?? null),
  );
  /** Exposes the formatted cook count for the header area. */
  protected readonly cookingPersonsLabel = computed(() => this.cookingPersons());
  /** Limits the visible cook labels to the number of active cooks. */
  protected readonly cookLabelSources = computed(() =>
    getCookLabelSources(this.cookingPersons()),
  );
  /** Maps the raw recipe step text into display rows without altering the original instructions. */
  protected readonly preparationDirections = computed(() =>
    buildPreparationDirections(this.selectedRecipe(), this.cookLabelSources()),
  );
  /** Splits the ingredient display into user-provided and extra ingredients. */
  protected readonly ingredientColumns = computed(() =>
    buildIngredientColumns(this.selectedRecipe()),
  );

  /** Registers resize listeners and restores the persisted like state for the active recipe. */
  constructor() {
    if (typeof window !== 'undefined') {
      this.registerMobileLayoutListener();
    }

    effect(() => {
      this.syncLikedState();
    });
  }

  /** Toggles the liked state for the currently selected recipe and persists the like in Firestore. */
  protected toggleLike(): void {
    const recipe = this.selectedRecipe();

    if (!recipe) {
      return;
    }

    const nextValue = !this.isLiked();
    this.applyLikeState(recipe.title, nextValue);
    this.persistRecipeLike(recipe, nextValue);
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

  /** Subscribes to the mobile breakpoint and tears the listener down on destroy. */
  private registerMobileLayoutListener(): void {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateMobileLayout = (event: MediaQueryList | MediaQueryListEvent): void =>
      this.isMobileLayout.set(event.matches);
    updateMobileLayout(mediaQuery);
    mediaQuery.addEventListener('change', updateMobileLayout);
    this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', updateMobileLayout));
  }

  /** Synchronizes the current recipe's liked state from localStorage. */
  private syncLikedState(): void {
    const recipe = this.selectedRecipe();
    const isLiked = !!recipe && typeof window !== 'undefined' && this.isRecipeLiked(recipe.title);
    this.isLiked.set(isLiked);
  }

  /** Checks localStorage for the persisted like state of a recipe title. */
  private isRecipeLiked(recipeTitle: string): boolean {
    return window.localStorage.getItem(this.getLikedRecipeStorageKey(recipeTitle)) === 'true';
  }

  /** Persists the liked state for the active recipe title in localStorage. */
  private persistLikedState(recipeTitle: string, nextValue: boolean): void {
    window.localStorage.setItem(this.getLikedRecipeStorageKey(recipeTitle), String(nextValue));
  }

  /** Updates the local liked state and mirrors it to localStorage when available. */
  private applyLikeState(recipeTitle: string, nextValue: boolean): void {
    this.isLiked.set(nextValue);

    if (typeof window !== 'undefined') {
      this.persistLikedState(recipeTitle, nextValue);
    }
  }

  /** Persists a positive like toggle to Firestore. */
  private persistRecipeLike(recipe: GeneratedRecipe, nextValue: boolean): void {
    if (nextValue) {
      void this.cookbookStore.likeRecipe(recipe);
    }
  }
}

type NutritionFact = { label: string; value: string };
type IngredientColumns = { yourIngredients: string[]; extraIngredients: string[] };

/** Builds the visible preference tags for the preparation page. */
function buildPreparationPreferenceTags(
  recipe: GeneratedRecipe | null,
  preferences: ReturnType<RecipeGenerationService['lastUsedPreferences']>,
): string[] {
  const tags: string[] = recipe?.dietTag ? [recipe.dietTag] : [];
  tags.push(getCookingTimeCategory(recipe?.prepTime ?? ''));
  return appendCuisineTag(tags, resolveCuisineTag(recipe, preferences?.cuisine));
}

/** Resolves the visible cuisine tag from the recipe itself before falling back to request preferences. */
function resolveCuisineTag(
  recipe: GeneratedRecipe | null,
  preferredCuisine: string | null | undefined,
): string | null {
  const recipeCuisineTag = mapCuisineSlugToLabel(recipe?.cuisineSlug);
  return recipeCuisineTag ?? preferredCuisine ?? null;
}

/** Appends the selected cuisine tag when it is meaningful. */
function appendCuisineTag(tags: string[], cuisine: string | null | undefined): string[] {
  const trimmedCuisine = cuisine?.trim();
  return trimmedCuisine && trimmedCuisine !== 'No preferences' ? [...tags, trimmedCuisine] : tags;
}

/** Maps stored cookbook cuisine slugs back to the UI labels used in the badges. */
function mapCuisineSlugToLabel(cuisineSlug: string | null | undefined): string | null {
  switch (cuisineSlug) {
    case 'italian':
      return 'Italian';
    case 'german':
      return 'German';
    case 'japanese':
      return 'Japanese';
    case 'indian':
      return 'Indian';
    case 'gourmet':
      return 'Gourmet';
    case 'fusion':
      return 'Fusion';
    default:
      return null;
  }
}

/** Builds the nutrition sidebar values from the selected recipe. */
function buildNutritionFacts(recipeNutrition: RecipeNutrition['perPortion'] | null): NutritionFact[] {
  if (!recipeNutrition) {
    return createEmptyNutritionFacts();
  }

  return [
    createNutritionFact('Energie', recipeNutrition.calories, 'kcal'),
    createNutritionFact('Protein', recipeNutrition.protein_g, 'g'),
    createNutritionFact('Fat', recipeNutrition.fat_g, 'g'),
    createNutritionFact('Carbs', recipeNutrition.carbs_g, 'g'),
  ];
}

/** Builds a single labeled nutrition display value. */
function createNutritionFact(label: string, value: number | null, unit: string): NutritionFact {
  return { label, value: formatNutritionValue(value, unit) };
}

/** Builds the empty nutrition placeholder values. */
function createEmptyNutritionFacts(): NutritionFact[] {
  return ['Energie', 'Protein', 'Fat', 'Carbs'].map((label) =>
    createNutritionFact(label, null, label === 'Energie' ? 'kcal' : 'g'),
  );
}

/** Limits the cook labels to the number of active cooks. */
function getCookLabelSources(cookingPersons: number): string[] {
  return AVAILABLE_COOK_LABELS.slice(0, Math.min(cookingPersons, AVAILABLE_COOK_LABELS.length));
}

/** Maps recipe steps into the preparation-page display rows. */
function buildPreparationDirections(recipe: GeneratedRecipe | null, activeCookLabels: string[]) {
  return (recipe?.steps ?? []).map((step, index) => ({
    number: index + 1,
    title: `Step ${index + 1}`,
    text: step.trim(),
    cookLabelSource: activeCookLabels[index % activeCookLabels.length] ?? AVAILABLE_COOK_LABELS[0],
  }));
}

/** Splits the ingredient display into user and extra columns. */
function buildIngredientColumns(recipe: GeneratedRecipe | null): IngredientColumns {
  if (hasExplicitIngredientColumns(recipe)) {
    return {
      yourIngredients: recipe?.userIngredients ?? [],
      extraIngredients: recipe?.extraIngredients ?? [],
    };
  }

  return splitRecipeIngredients(recipe?.ingredients ?? []);
}

/** Checks whether the recipe already separates user and extra ingredients. */
function hasExplicitIngredientColumns(recipe: GeneratedRecipe | null): boolean {
  return !!(recipe?.userIngredients || recipe?.extraIngredients);
}

/** Splits a single ingredient list into two display columns. */
function splitRecipeIngredients(ingredients: string[]): IngredientColumns {
  const splitIndex = Math.min(4, Math.ceil(ingredients.length / 2));
  return {
    yourIngredients: ingredients.slice(0, splitIndex),
    extraIngredients: ingredients.slice(splitIndex),
  };
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

import { computed, Injectable, signal } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseConfig, hasFirebaseConfig } from '../config/firebase.config';
import {
  GeneratedRecipe,
  RecipeGenerationPreferences,
  StoredCookbookRecipe,
  type RecipeNutrition,
} from '../models/recipe.model';

type FirestoreRecipeDocument = {
  title: string;
  titleNormalized: string;
  description: string;
  prepTime: string;
  prepTimeMinutes: number | null;
  cookCount: number;
  likes: number;
  dietTag: 'Vegetarian' | 'Vegan' | 'Keto' | null;
  cuisineSlug: string;
  userIngredients: string[];
  extraIngredients: string[];
  ingredients: string[];
  steps: string[];
  nutrition: RecipeNutrition | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

@Injectable({ providedIn: 'root' })
export class CookbookStoreService {
  private readonly db = createFirestore();
  private readonly recipesState = signal<StoredCookbookRecipe[]>([]);
  readonly recipes = computed(() => this.recipesState());
  readonly topLikedRecipes = computed(() =>
    [...this.recipesState()].sort((left, right) => right.likes - left.likes).slice(0, 5),
  );

  constructor() {
    void this.refreshRecipes();
  }

  /** Returns all cookbook recipes that belong to the provided cuisine slug. */
  recipesByCuisine(slug: string): StoredCookbookRecipe[] {
    return this.recipesState().filter((recipe) => recipe.cuisineSlug === slug);
  }

  /** Reloads the cookbook recipes from Firestore and keeps the store empty when none exist yet. */
  async refreshRecipes(): Promise<void> {
    if (!this.db) return this.clearRecipes();
    try {
      await this.applyLoadedRecipes();
      return;
    } catch (error) {
      console.error('Failed to load cookbook recipes from Firestore.', error);
    }
    this.clearRecipes();
  }

  /** Persists newly generated recipes to Firestore while skipping library entries and duplicates. */
  async saveGeneratedRecipes(
    recipes: GeneratedRecipe[],
    preferences: RecipeGenerationPreferences | null,
  ): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.persistGeneratedRecipes(recipes, preferences);

    await this.refreshRecipes();
  }

  /** Increments the like counter for a persisted cookbook recipe. */
  async likeRecipe(recipe: GeneratedRecipe): Promise<void> {
    if (!this.db || !recipe.id) {
      return;
    }

    await this.incrementRecipeLike(recipe.id);
    this.applyLocalLike(recipe.id);
  }

  /** Loads the cookbook recipes ordered by likes from Firestore. */
  private async loadRecipes(): Promise<StoredCookbookRecipe[]> {
    const recipeQuery = query(collection(this.db!, 'recipes'), orderBy('likes', 'desc'));
    const snapshot = await getDocs(recipeQuery);
    return snapshot.docs.map((entry) =>
      mapFirestoreRecipe(entry.id, entry.data() as FirestoreRecipeDocument),
    );
  }

  /** Clears the local cookbook store state. */
  private clearRecipes(): void {
    this.recipesState.set([]);
  }

  /** Loads cookbook recipes and applies them to local state. */
  private async applyLoadedRecipes(): Promise<void> {
    const recipes = await this.loadRecipes();
    this.recipesState.set(recipes.length ? recipes : []);
  }

  /** Builds the Firestore payload for a generated recipe or skips invalid titles. */
  private buildPersistencePayload(
    recipe: GeneratedRecipe,
    preferences: RecipeGenerationPreferences | null,
  ): FirestoreRecipeDocument | null {
    const cuisineSlug = recipe.cuisineSlug ?? mapCuisinePreferenceToSlug(preferences?.cuisine);
    const titleNormalized = normalizeTitle(recipe.title);
    return titleNormalized ? createRecipeDocument(recipe, preferences, titleNormalized, cuisineSlug) : null;
  }

  /** Persists a single generated recipe when it is valid and not yet stored. */
  private async persistGeneratedRecipe(
    recipe: GeneratedRecipe,
    preferences: RecipeGenerationPreferences | null,
  ): Promise<void> {
    const persistencePayload = this.buildPersistencePayload(recipe, preferences);

    if (!persistencePayload || (await this.isDuplicateRecipe(persistencePayload))) {
      return;
    }

    await addDoc(collection(this.db!, 'recipes'), persistencePayload);
  }

  /** Persists every non-library recipe from the generated result list. */
  private async persistGeneratedRecipes(
    recipes: GeneratedRecipe[],
    preferences: RecipeGenerationPreferences | null,
  ): Promise<void> {
    const recipesToPersist = recipes.filter((recipe) => recipe.source !== 'library');

    for (const recipe of recipesToPersist) {
      await this.persistGeneratedRecipe(recipe, preferences);
    }
  }

  /** Checks whether the recipe already exists for the same cuisine. */
  private async recipeExists(titleNormalized: string, cuisineSlug: string): Promise<boolean> {
    const existingRecipeQuery = query(
      collection(this.db!, 'recipes'),
      where('titleNormalized', '==', titleNormalized),
      where('cuisineSlug', '==', cuisineSlug),
      limit(1),
    );
    const existingSnapshot = await getDocs(existingRecipeQuery);
    return !existingSnapshot.empty;
  }

  /** Checks whether the prepared Firestore payload already exists as a stored recipe. */
  private isDuplicateRecipe(recipe: FirestoreRecipeDocument): Promise<boolean> {
    return this.recipeExists(recipe.titleNormalized, recipe.cuisineSlug);
  }

  /** Persists the like increment in Firestore. */
  private incrementRecipeLike(recipeId: string): Promise<void> {
    return updateDoc(doc(this.db!, 'recipes', recipeId), {
      likes: increment(1),
      updatedAt: serverTimestamp(),
    });
  }

  /** Mirrors a successful like increment in local state. */
  private applyLocalLike(recipeId: string): void {
    this.recipesState.update((recipes) =>
      recipes.map((entry) => (entry.id === recipeId ? { ...entry, likes: entry.likes + 1 } : entry)),
    );
  }
}

/** Creates a Firestore instance only when a complete Firebase web config is available. */
function createFirestore(): Firestore | null {
  const firebaseConfig = getFirebaseConfig();

  if (!hasFirebaseConfig(firebaseConfig)) {
    return null;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

/** Maps a Firestore recipe document into the application's cookbook recipe model. */
function mapFirestoreRecipe(
  id: string,
  recipe: FirestoreRecipeDocument,
): StoredCookbookRecipe {
  return {
    ...pickStoredRecipeFields(recipe),
    id,
    source: 'library',
  };
}

/** Builds the Firestore document stored for a generated recipe. */
function createRecipeDocument(
  recipe: GeneratedRecipe,
  preferences: RecipeGenerationPreferences | null,
  titleNormalized: string,
  cuisineSlug: string,
): FirestoreRecipeDocument {
  const timestamps = createRecipeTimestamps();
  return { ...pickPersistedRecipeFields(recipe, preferences), ...timestamps, title: recipe.title, titleNormalized, cuisineSlug };
}

/** Builds the normalized title key used for duplicate detection in Firestore. */
function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replaceAll(/[^a-z0-9\s-]/g, '').replaceAll(/\s+/g, '-');
}

/** Maps the selected cuisine preference to the cookbook slug convention. */
function mapCuisinePreferenceToSlug(cuisine: string | null | undefined): string {
  return CUISINE_PREFERENCE_SLUGS[cuisine ?? ''] ?? 'fusion';
}

/** Parses a compact prep-time label back into a number of minutes. */
function parsePrepTimeToMinutes(prepTime: string): number | null {
  const minutes = Number.parseInt(prepTime.replace(/\D/g, ''), 10);
  return Number.isNaN(minutes) ? null : minutes;
}

/** Picks the cookbook fields shared by stored recipe objects. */
function pickStoredRecipeFields(recipe: FirestoreRecipeDocument): Omit<StoredCookbookRecipe, 'id' | 'source'> {
  return {
    ...pickStoredRecipeMeta(recipe),
    ...pickStoredRecipeLists(recipe),
    titleNormalized: recipe.titleNormalized,
  };
}

/** Picks the generated-recipe fields persisted to Firestore. */
function pickPersistedRecipeFields(
  recipe: GeneratedRecipe,
  preferences: RecipeGenerationPreferences | null,
): Omit<FirestoreRecipeDocument, 'title' | 'titleNormalized' | 'cuisineSlug' | 'createdAt' | 'updatedAt'> {
  return {
    ...pickPersistedRecipeMeta(recipe, preferences),
    ...pickPersistedRecipeLists(recipe),
    nutrition: recipe.nutrition ?? null,
  };
}

const CUISINE_PREFERENCE_SLUGS: Record<string, string> = {
  Italian: 'italian',
  German: 'german',
  Japanese: 'japanese',
  Indian: 'indian',
  Gourmet: 'gourmet',
  Fusion: 'fusion',
};

/** Picks the scalar cookbook fields shared by stored recipe objects. */
function pickStoredRecipeMeta(
  recipe: FirestoreRecipeDocument,
): Pick<
  StoredCookbookRecipe,
  'title' | 'description' | 'prepTime' | 'prepTimeMinutes' | 'cookCount' | 'likes' | 'dietTag' | 'cuisineSlug'
> {
  const { title, description, prepTime, prepTimeMinutes, cookCount, likes, dietTag, cuisineSlug } = recipe;
  return { title, description, prepTime, prepTimeMinutes, cookCount, likes, dietTag, cuisineSlug };
}

/** Picks the array cookbook fields shared by stored recipe objects. */
function pickStoredRecipeLists(
  recipe: FirestoreRecipeDocument,
): Pick<StoredCookbookRecipe, 'userIngredients' | 'extraIngredients' | 'ingredients' | 'steps' | 'nutrition'> {
  return {
    userIngredients: recipe.userIngredients,
    extraIngredients: recipe.extraIngredients,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    nutrition: recipe.nutrition,
  };
}

/** Picks the scalar generated-recipe fields persisted to Firestore. */
function pickPersistedRecipeMeta(
  recipe: GeneratedRecipe,
  preferences: RecipeGenerationPreferences | null,
): Pick<
  FirestoreRecipeDocument,
  'description' | 'prepTime' | 'prepTimeMinutes' | 'cookCount' | 'likes' | 'dietTag'
> {
  const prepTimeMinutes = recipe.prepTimeMinutes ?? parsePrepTimeToMinutes(recipe.prepTime);
  const cookCount = recipe.cookCount ?? Math.max(1, preferences?.persons ?? 1);
  return { description: recipe.description, prepTime: recipe.prepTime, prepTimeMinutes, cookCount, likes: recipe.likes ?? 0, dietTag: recipe.dietTag ?? null };
}

/** Picks the list fields persisted to Firestore for generated recipes. */
function pickPersistedRecipeLists(
  recipe: GeneratedRecipe,
): Pick<FirestoreRecipeDocument, 'userIngredients' | 'extraIngredients' | 'ingredients' | 'steps'> {
  return {
    userIngredients: recipe.userIngredients ?? [],
    extraIngredients: recipe.extraIngredients ?? [],
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
}

/** Builds the created/updated timestamp payload for persisted recipes. */
function createRecipeTimestamps(): Pick<FirestoreRecipeDocument, 'createdAt' | 'updatedAt'> {
  return { createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
}

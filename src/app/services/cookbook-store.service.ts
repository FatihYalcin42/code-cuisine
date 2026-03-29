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
    if (!this.db) {
      this.recipesState.set([]);
      return;
    }

    try {
      const recipeQuery = query(collection(this.db, 'recipes'), orderBy('likes', 'desc'));
      const snapshot = await getDocs(recipeQuery);
      const recipes = snapshot.docs.map((entry) =>
        mapFirestoreRecipe(entry.id, entry.data() as FirestoreRecipeDocument),
      );

      if (recipes.length > 0) {
        this.recipesState.set(recipes);
        return;
      }
    } catch (error) {
      console.error('Failed to load cookbook recipes from Firestore.', error);
    }

    this.recipesState.set([]);
  }

  /** Persists newly generated recipes to Firestore while skipping library entries and duplicates. */
  async saveGeneratedRecipes(
    recipes: GeneratedRecipe[],
    preferences: RecipeGenerationPreferences | null,
  ): Promise<void> {
    if (!this.db) {
      return;
    }

    const recipesToPersist = recipes.filter((recipe) => recipe.source !== 'library');

    for (const recipe of recipesToPersist) {
      const cuisineSlug = recipe.cuisineSlug ?? mapCuisinePreferenceToSlug(preferences?.cuisine);
      const titleNormalized = normalizeTitle(recipe.title);

      if (!titleNormalized) {
        continue;
      }

      const existingRecipeQuery = query(
        collection(this.db, 'recipes'),
        where('titleNormalized', '==', titleNormalized),
        where('cuisineSlug', '==', cuisineSlug),
        limit(1),
      );
      const existingSnapshot = await getDocs(existingRecipeQuery);

      if (!existingSnapshot.empty) {
        continue;
      }

      await addDoc(collection(this.db, 'recipes'), {
        title: recipe.title,
        titleNormalized,
        description: recipe.description,
        prepTime: recipe.prepTime,
        prepTimeMinutes: recipe.prepTimeMinutes ?? parsePrepTimeToMinutes(recipe.prepTime),
        cookCount: recipe.cookCount ?? Math.max(1, preferences?.persons ?? 1),
        likes: recipe.likes ?? 0,
        dietTag: recipe.dietTag ?? null,
        cuisineSlug,
        userIngredients: recipe.userIngredients ?? [],
        extraIngredients: recipe.extraIngredients ?? [],
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        nutrition: recipe.nutrition ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } satisfies FirestoreRecipeDocument);
    }

    await this.refreshRecipes();
  }

  /** Increments the like counter for a persisted cookbook recipe. */
  async likeRecipe(recipe: GeneratedRecipe): Promise<void> {
    if (!this.db || !recipe.id) {
      return;
    }

    await updateDoc(doc(this.db, 'recipes', recipe.id), {
      likes: increment(1),
      updatedAt: serverTimestamp(),
    });

    this.recipesState.update((recipes) =>
      recipes.map((entry) =>
        entry.id === recipe.id
          ? {
              ...entry,
              likes: entry.likes + 1,
            }
          : entry,
      ),
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
    id,
    source: 'library',
    title: recipe.title,
    description: recipe.description,
    prepTime: recipe.prepTime,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookCount: recipe.cookCount,
    likes: recipe.likes,
    dietTag: recipe.dietTag,
    cuisineSlug: recipe.cuisineSlug,
    userIngredients: recipe.userIngredients,
    extraIngredients: recipe.extraIngredients,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    nutrition: recipe.nutrition,
    titleNormalized: recipe.titleNormalized,
  };
}

/** Builds the normalized title key used for duplicate detection in Firestore. */
function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replaceAll(/[^a-z0-9\s-]/g, '').replaceAll(/\s+/g, '-');
}

/** Maps the selected cuisine preference to the cookbook slug convention. */
function mapCuisinePreferenceToSlug(cuisine: string | null | undefined): string {
  switch (cuisine) {
    case 'Italian':
      return 'italian';
    case 'German':
      return 'german';
    case 'Japanese':
      return 'japanese';
    case 'Indian':
      return 'indian';
    case 'Gourmet':
      return 'gourmet';
    case 'Fusion':
      return 'fusion';
    default:
      return 'fusion';
  }
}

/** Parses a compact prep-time label back into a number of minutes. */
function parsePrepTimeToMinutes(prepTime: string): number | null {
  const minutes = Number.parseInt(prepTime.replace(/\D/g, ''), 10);
  return Number.isNaN(minutes) ? null : minutes;
}

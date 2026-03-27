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
import { COOKBOOK_FALLBACK_LIBRARY_RECIPES } from '../data/cookbook-fallback.data';
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
  private readonly recipesState = signal<StoredCookbookRecipe[]>(COOKBOOK_FALLBACK_LIBRARY_RECIPES);
  readonly recipes = computed(() => this.recipesState());
  readonly topLikedRecipes = computed(() =>
    [...this.recipesState()].sort((left, right) => right.likes - left.likes).slice(0, 5),
  );
  readonly isUsingFallback = signal(this.db === null);

  constructor() {
    void this.refreshRecipes();
  }

  recipesByCuisine(slug: string): StoredCookbookRecipe[] {
    return this.recipesState().filter((recipe) => recipe.cuisineSlug === slug);
  }

  async refreshRecipes(): Promise<void> {
    if (!this.db) {
      this.isUsingFallback.set(true);
      this.recipesState.set(COOKBOOK_FALLBACK_LIBRARY_RECIPES);
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
        this.isUsingFallback.set(false);
        return;
      }

      await this.seedInitialRecipes();

      const seededSnapshot = await getDocs(recipeQuery);
      const seededRecipes = seededSnapshot.docs.map((entry) =>
        mapFirestoreRecipe(entry.id, entry.data() as FirestoreRecipeDocument),
      );

      if (seededRecipes.length > 0) {
        this.recipesState.set(seededRecipes);
        this.isUsingFallback.set(false);
        return;
      }
    } catch (error) {
      console.error('Failed to load cookbook recipes from Firestore.', error);
    }

    this.isUsingFallback.set(true);
    this.recipesState.set(COOKBOOK_FALLBACK_LIBRARY_RECIPES);
  }

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

  private async seedInitialRecipes(): Promise<void> {
    if (!this.db) {
      return;
    }

    for (const recipe of COOKBOOK_FALLBACK_LIBRARY_RECIPES) {
      await addDoc(collection(this.db, 'recipes'), {
        title: recipe.title,
        titleNormalized: normalizeTitle(recipe.title),
        description: recipe.description,
        prepTime: recipe.prepTime,
        prepTimeMinutes: recipe.prepTimeMinutes ?? parsePrepTimeToMinutes(recipe.prepTime),
        cookCount: recipe.cookCount ?? 1,
        likes: recipe.likes,
        dietTag: recipe.dietTag ?? null,
        cuisineSlug: recipe.cuisineSlug ?? 'fusion',
        userIngredients: recipe.userIngredients ?? [],
        extraIngredients: recipe.extraIngredients ?? [],
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        nutrition: recipe.nutrition ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } satisfies FirestoreRecipeDocument);
    }
  }
}

function createFirestore(): Firestore | null {
  const firebaseConfig = getFirebaseConfig();

  if (!hasFirebaseConfig(firebaseConfig)) {
    return null;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

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

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replaceAll(/[^a-z0-9\s-]/g, '').replaceAll(/\s+/g, '-');
}

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

function parsePrepTimeToMinutes(prepTime: string): number | null {
  const minutes = Number.parseInt(prepTime.replace(/\D/g, ''), 10);
  return Number.isNaN(minutes) ? null : minutes;
}

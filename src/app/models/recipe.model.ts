export interface RecipeGenerationIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeGenerationPreferences {
  portions: number;
  persons: number;
  cookingTime: string | null;
  cuisine: string | null;
  diet: string | null;
}

export interface RecipeGenerationRequest {
  ingredients: RecipeGenerationIngredient[];
  preferences: RecipeGenerationPreferences;
}

export interface RecipeNutritionFacts {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export interface RecipeNutrition {
  perPortion: RecipeNutritionFacts;
  total: RecipeNutritionFacts;
}

export interface GeneratedRecipe {
  id?: string;
  source?: 'library' | 'generated';
  title: string;
  description: string;
  prepTime: string;
  prepTimeMinutes?: number | null;
  cookCount?: number;
  likes?: number;
  dietTag?: 'Vegetarian' | 'Vegan' | 'Keto' | null;
  cuisineSlug?: string | null;
  userIngredients?: string[];
  extraIngredients?: string[];
  ingredients: string[];
  steps: string[];
  nutrition?: RecipeNutrition | null;
}

export interface StoredCookbookRecipe extends GeneratedRecipe {
  id: string;
  likes: number;
  titleNormalized?: string;
}

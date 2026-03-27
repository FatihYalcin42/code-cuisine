import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IngredientDraftStateService } from '../../services/ingredient-draft-state.service';
import { RecipeGenerationService } from '../../services/recipe-generation.service';
import { RecipeGenerationRequest } from '../../models/recipe.model';

const MAX_PORTIONS = 12;
const MAX_COOKS = 4;

@Component({
  selector: 'app-preferences-page',
  imports: [RouterLink],
  templateUrl: './preferences-page.html',
  styleUrl: './preferences-page.scss',
})
export class PreferencesPageComponent {
  private readonly ingredientDraftState = inject(IngredientDraftStateService);
  private readonly recipeGeneration = inject(RecipeGenerationService);
  private readonly router = inject(Router);
  protected readonly portions = signal(2);
  protected readonly persons = signal(1);
  protected readonly selectedCookingTime = signal<string | null>(null);
  protected readonly selectedCuisine = signal<string | null>(null);
  protected readonly selectedDietPreference = signal<string | null>(null);
  protected readonly isQuantityPopupOpen = signal(false);

  protected decreasePortions(): void {
    this.portions.update((value) => Math.max(1, value - 1));
  }

  protected increasePortions(): void {
    this.portions.update((value) => Math.min(MAX_PORTIONS, value + 1));
  }

  protected decreasePersons(): void {
    this.persons.update((value) => Math.max(1, value - 1));
  }

  protected increasePersons(): void {
    this.persons.update((value) => Math.min(MAX_COOKS, value + 1));
  }

  protected selectCookingTime(option: string): void {
    this.selectedCookingTime.update((currentValue) => (currentValue === option ? null : option));
  }

  protected selectCuisine(option: string): void {
    this.selectedCuisine.update((currentValue) => (currentValue === option ? null : option));
  }

  protected selectDietPreference(option: string): void {
    this.selectedDietPreference.update((currentValue) => (currentValue === option ? null : option));
  }

  protected async generateRecipe(): Promise<void> {
    if (this.hasInsufficientIngredientQuantities()) {
      this.isQuantityPopupOpen.set(true);
      return;
    }

    this.recipeGeneration.queueRecipeGeneration(this.buildRecipeRequest());
    await this.router.navigateByUrl('/loading');
  }

  protected closeQuantityPopup(): void {
    this.isQuantityPopupOpen.set(false);
  }

  protected async goBackToIngredients(): Promise<void> {
    this.closeQuantityPopup();
    await this.router.navigateByUrl('/generate-recipe');
  }

  private hasInsufficientIngredientQuantities(): boolean {
    const selectedPortions = this.portions();
    const ingredientEntries = this.ingredientDraftState.ingredientEntries();

    if (ingredientEntries.length === 0) {
      return true;
    }

    const servingCapacities = ingredientEntries
      .map((entry) => getServingCapacity(entry.amount, entry.unit))
      .filter((capacity) => capacity > 0)
      .sort((left, right) => right - left);

    if (!servingCapacities.length) {
      return true;
    }

    const requiredStrongIngredients = Math.min(2, servingCapacities.length);
    const strongIngredients = servingCapacities.filter((capacity) => capacity >= selectedPortions);

    if (strongIngredients.length >= requiredStrongIngredients) {
      return false;
    }

    const strongestCombinedCapacity = servingCapacities
      .slice(0, requiredStrongIngredients)
      .reduce((sum, capacity) => sum + capacity, 0);

    return strongestCombinedCapacity < selectedPortions * requiredStrongIngredients;
  }

  private buildRecipeRequest(): RecipeGenerationRequest {
    return {
      ingredients: this.ingredientDraftState.ingredientEntries().map((entry) => ({
        name: entry.name,
        amount: Number.parseInt(entry.amount, 10),
        unit: entry.unit,
      })),
      preferences: {
        portions: this.portions(),
        persons: this.persons(),
        cookingTime: this.selectedCookingTime(),
        cuisine: this.selectedCuisine(),
        diet: this.selectedDietPreference(),
      },
    };
  }
}

function getServingCapacity(amountAsText: string, unit: string): number {
  const amount = Number.parseInt(amountAsText, 10);

  if (Number.isNaN(amount) || amount < 1) {
    return 0;
  }

  if (unit === 'piece') {
    return amount;
  }

  return amount / 100;
}

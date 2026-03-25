import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IngredientDraftStateService } from '../../services/ingredient-draft-state.service';
import {
  RecipeGenerationRequest,
  RecipeGenerationService,
} from '../../services/recipe-generation.service';

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
    this.portions.update((value) => value + 1);
  }

  protected decreasePersons(): void {
    this.persons.update((value) => Math.max(1, value - 1));
  }

  protected increasePersons(): void {
    this.persons.update((value) => value + 1);
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

    const availableServingCapacity = ingredientEntries.reduce((capacity, entry) => {
      const amount = Number.parseInt(entry.amount, 10);

      if (Number.isNaN(amount) || amount < 1) {
        return capacity;
      }

      if (entry.unit === 'piece') {
        return capacity + amount;
      }

      return capacity + amount / 100;
    }, 0);

    return availableServingCapacity < selectedPortions;
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

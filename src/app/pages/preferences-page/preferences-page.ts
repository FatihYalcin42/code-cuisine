import { Component, computed, inject, signal } from '@angular/core';
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
  protected readonly preferenceValidationMessage = signal('');
  protected readonly hasAllRequiredPreferences = computed(
    () =>
      this.selectedCookingTime() !== null &&
      this.selectedCuisine() !== null &&
      this.selectedDietPreference() !== null,
  );

  /** Decreases the requested portion count without dropping below one portion. */
  protected decreasePortions(): void {
    this.portions.update((value) => Math.max(1, value - 1));
  }

  /** Increases the requested portion count up to the configured maximum. */
  protected increasePortions(): void {
    this.portions.update((value) => Math.min(MAX_PORTIONS, value + 1));
  }

  /** Decreases the number of active cooks without dropping below one person. */
  protected decreasePersons(): void {
    this.persons.update((value) => Math.max(1, value - 1));
  }

  /** Increases the number of active cooks up to the configured maximum. */
  protected increasePersons(): void {
    this.persons.update((value) => Math.min(MAX_COOKS, value + 1));
  }

  /** Toggles the selected cooking-time preference. */
  protected selectCookingTime(option: string): void {
    this.selectedCookingTime.update((currentValue) => (currentValue === option ? null : option));
    this.clearPreferenceValidationMessageIfReady();
  }

  /** Toggles the selected cuisine preference. */
  protected selectCuisine(option: string): void {
    this.selectedCuisine.update((currentValue) => (currentValue === option ? null : option));
    this.clearPreferenceValidationMessageIfReady();
  }

  /** Toggles the selected diet preference. */
  protected selectDietPreference(option: string): void {
    this.selectedDietPreference.update((currentValue) => (currentValue === option ? null : option));
    this.clearPreferenceValidationMessageIfReady();
  }

  /** Validates the current request and queues recipe generation when all requirements are met. */
  protected async generateRecipe(): Promise<void> {
    if (!this.hasAllRequiredPreferences()) {
      this.preferenceValidationMessage.set(
        'Select one option in cooking time, cuisine, and diet preferences before generating a recipe.',
      );
      return;
    }

    if (this.hasInsufficientIngredientQuantities()) {
      this.isQuantityPopupOpen.set(true);
      return;
    }

    this.preferenceValidationMessage.set('');
    this.recipeGeneration.queueRecipeGeneration(this.buildRecipeRequest());
    await this.router.navigateByUrl('/loading');
  }

  /** Closes the insufficient-quantity popup. */
  protected closeQuantityPopup(): void {
    this.isQuantityPopupOpen.set(false);
  }

  /** Returns the user to ingredient entry after dismissing the quantity popup. */
  protected async goBackToIngredients(): Promise<void> {
    this.closeQuantityPopup();
    await this.router.navigateByUrl('/generate-recipe');
  }

  /** Checks whether the strongest entered ingredients can realistically cover the selected portions. */
  private hasInsufficientIngredientQuantities(): boolean {
    const selectedPortions = this.portions();
    const servingCapacities = getSortedServingCapacities(this.ingredientDraftState.ingredientEntries());

    if (!servingCapacities.length) {
      return true;
    }

    return lacksEnoughCapacityForPortions(servingCapacities, selectedPortions);
  }

  /** Builds the normalized generation payload that is sent to the recipe service. */
  private buildRecipeRequest(): RecipeGenerationRequest {
    const cookingTime = this.selectedCookingTime();
    const cuisine = this.selectedCuisine();
    const diet = this.selectedDietPreference();

    if (!cookingTime || !cuisine || !diet) {
      throw new Error('Recipe generation requires cooking time, cuisine, and diet preferences.');
    }

    return {
      ingredients: mapDraftEntriesToRequestIngredients(this.ingredientDraftState.ingredientEntries()),
      preferences: createRequestPreferences(this.portions(), this.persons(), cookingTime, cuisine, diet),
    };
  }

  /** Clears the validation hint once all required preferences are available again. */
  private clearPreferenceValidationMessageIfReady(): void {
    if (this.hasAllRequiredPreferences()) {
      this.preferenceValidationMessage.set('');
    }
  }
}

/** Converts ingredient drafts into sorted serving-capacity scores. */
function getSortedServingCapacities(
  entries: ReturnType<IngredientDraftStateService['ingredientEntries']>,
): number[] {
  return entries
    .map((entry) => getServingCapacity(entry.amount, entry.unit))
    .filter((capacity) => capacity > 0)
    .sort((left, right) => right - left);
}

/** Checks whether the strongest ingredients can cover the selected portions. */
function lacksEnoughCapacityForPortions(servingCapacities: number[], selectedPortions: number): boolean {
  const requiredStrongIngredients = Math.min(2, servingCapacities.length);
  const strongIngredients = servingCapacities.filter((capacity) => capacity >= selectedPortions);

  if (strongIngredients.length >= requiredStrongIngredients) {
    return false;
  }

  return sumStrongestCapacities(servingCapacities, requiredStrongIngredients) <
    selectedPortions * requiredStrongIngredients;
}

/** Sums the strongest ingredient capacities required for the capacity check. */
function sumStrongestCapacities(servingCapacities: number[], count: number): number {
  return servingCapacities.slice(0, count).reduce((sum, capacity) => sum + capacity, 0);
}

/** Maps draft ingredient entries into the request payload format. */
function mapDraftEntriesToRequestIngredients(
  entries: ReturnType<IngredientDraftStateService['ingredientEntries']>,
) {
  return entries.map((entry) => ({
    name: entry.name,
    amount: Number.parseInt(entry.amount, 10),
    unit: entry.unit,
  }));
}

/** Builds the normalized preference payload sent to the recipe service. */
function createRequestPreferences(
  portions: number,
  persons: number,
  cookingTime: string,
  cuisine: string,
  diet: string,
) {
  return { portions, persons, cookingTime, cuisine, diet };
}

/** Converts a raw amount/unit pair into an approximate serving-capacity score. */
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

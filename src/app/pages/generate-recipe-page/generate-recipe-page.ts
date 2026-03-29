import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IngredientDraftStateService,
  IngredientEntry,
} from '../../services/ingredient-draft-state.service';

const KNOWN_INGREDIENTS = [
  'apple',
  'avocado',
  'basil',
  'beans',
  'beef',
  'bell pepper',
  'broccoli',
  'butter',
  'carrot',
  'cheese',
  'chicken',
  'chili',
  'cucumber',
  'egg',
  'flour',
  'garlic',
  'ginger',
  'lemon',
  'lettuce',
  'milk',
  'mushroom',
  'olive oil',
  'onion',
  'pasta',
  'potato',
  'rice',
  'salmon',
  'salt',
  'shrimp',
  'spinach',
  'tomato',
  'tuna',
  'yogurt',
  'zucchini',
];

const BLOCKED_INGREDIENT_WORDS = ['asdf', 'awas', 'qwertz', 'qwerty', 'test', 'xyz'];

@Component({
  selector: 'app-generate-recipe-page',
  imports: [RouterLink],
  templateUrl: './generate-recipe-page.html',
  styleUrl: './generate-recipe-page.scss',
})
export class GenerateRecipePageComponent {
  private readonly ingredientDraftState = inject(IngredientDraftStateService);
  protected readonly selectedUnit = signal('gram');
  protected readonly isUnitMenuOpen = signal(false);
  protected readonly ingredientName = signal('');
  protected readonly servingSizeValue = signal('');
  protected readonly ingredientEntries = this.ingredientDraftState.ingredientEntries;
  protected readonly formFeedback = signal('');
  protected readonly hasIngredientNameError = signal(false);
  protected readonly hasServingSizeError = signal(false);
  protected readonly highlightedIngredientSuggestions = computed(() =>
    getIngredientSuggestions(this.ingredientName()),
  );
  protected readonly ingredientGhostSuggestionSuffix = computed(() =>
    getIngredientSuggestionSuffix(this.ingredientName(), this.highlightedIngredientSuggestions()),
  );
  private readonly unitOptions = ['gram', 'ml', 'piece'];
  private readonly editingEntryId = signal<number | null>(null);
  protected readonly availableUnits = computed(() =>
    this.unitOptions.filter((unit) => unit !== this.selectedUnit()),
  );
  protected readonly ingredientNameSuggestions = computed(() =>
    this.ingredientEntries().map((entry) => entry.name),
  );
  protected readonly hasFormFeedback = computed(() => this.formFeedback().length > 0);
  protected readonly canShowNextStepButton = computed(() => this.ingredientEntries().length >= 1);

  /** Toggles the serving-size unit dropdown. */
  protected toggleUnitMenu(): void {
    this.isUnitMenuOpen.update((isOpen) => !isOpen);
  }

  /** Selects a serving-size unit and closes the dropdown. */
  protected selectUnit(unit: string): void {
    this.selectedUnit.set(unit);
    this.isUnitMenuOpen.set(false);
  }

  /** Stores the current ingredient name input value. */
  protected updateIngredientName(value: string): void {
    this.ingredientName.set(normalizeIngredientNameInput(value));
    this.hasIngredientNameError.set(false);
    this.clearFormFeedbackIfNeeded();
  }

  /** Stores the current serving-size input value. */
  protected updateServingSizeValue(value: string): void {
    this.servingSizeValue.set(normalizeServingSizeInput(value));
    this.hasServingSizeError.set(false);
    this.clearFormFeedbackIfNeeded();
  }

  /** Blocks non-numeric text input before it reaches the serving-size field. */
  protected restrictServingSizeInput(event: InputEvent): void {
    if (!event.data || event.inputType.startsWith('delete')) {
      return;
    }

    if (!/^\d+$/.test(event.data)) {
      event.preventDefault();
    }
  }

  /** Prevents pasting values that contain anything other than digits. */
  protected blockInvalidServingSizePaste(event: ClipboardEvent): void {
    const pastedText = event.clipboardData?.getData('text') ?? '';

    if (!/^\d+$/.test(pastedText)) {
      event.preventDefault();
    }
  }

  /** Adds a new ingredient entry or updates the currently edited one. */
  protected addIngredient(): void {
    const validation = this.validateIngredientForm();
    this.applyValidationState(validation);

    if (!validation.isValid) {
      return;
    }

    this.persistIngredient(validation.amountNumber, validation.name);
    this.resetIngredientForm();
  }

  /** Applies one of the suggested ingredient names to the active input field. */
  protected applyIngredientSuggestion(ingredient: string): void {
    this.ingredientName.set(ingredient);
    this.hasIngredientNameError.set(false);
    this.clearFormFeedbackIfNeeded();
  }

  /** Loads an ingredient entry back into the form for editing. */
  protected editIngredient(entry: IngredientEntry): void {
    this.ingredientName.set(entry.name);
    this.servingSizeValue.set(entry.amount);
    this.selectedUnit.set(entry.unit);
    this.editingEntryId.set(entry.id);
    this.isUnitMenuOpen.set(false);
  }

  /** Removes an ingredient entry from the generated list. */
  protected deleteIngredient(entryId: number): void {
    this.ingredientDraftState.deleteIngredient(entryId);

    if (this.editingEntryId() === entryId) {
      this.resetIngredientForm();
    }
  }

  /** Formats the entry amount for the list on the right side. */
  protected formatIngredientAmount(entry: IngredientEntry): string {
    if (entry.unit === 'piece') {
      return entry.amount;
    }

    return `${entry.amount}${entry.unit === 'gram' ? 'g' : 'ml'}`;
  }

  /** Clears the input state after adding, updating, or deleting an edited item. */
  private resetIngredientForm(): void {
    this.ingredientName.set('');
    this.servingSizeValue.set('');
    this.editingEntryId.set(null);
    this.isUnitMenuOpen.set(false);
    this.clearFormFeedback();
  }

  /** Validates free-text ingredient input against the lightweight client-side heuristics. */
  private isValidIngredientName(name: string): boolean {
    return isKnownOrLikelyIngredientName(name);
  }

  /** Clears transient validation feedback and field error states. */
  private clearFormFeedback(): void {
    this.formFeedback.set('');
    this.hasIngredientNameError.set(false);
    this.hasServingSizeError.set(false);
  }

  /** Clears feedback only when it is currently visible. */
  private clearFormFeedbackIfNeeded(): void {
    if (this.hasFormFeedback()) {
      this.clearFormFeedback();
    }
  }

  /** Validates the current ingredient form values. */
  private validateIngredientForm(): IngredientValidationResult {
    const name = this.ingredientName().trim();
    const amount = this.servingSizeValue().trim();
    const amountNumber = Number.parseInt(amount, 10);
    const missingName = !name;
    const invalidName = !missingName && !this.isValidIngredientName(name);
    const invalidServing = !amount || Number.isNaN(amountNumber) || amountNumber < 1;
    return { name, amountNumber, missingName, invalidName, invalidServing, isValid: false };
  }

  /** Applies field errors and feedback based on the current validation result. */
  private applyValidationState(validation: IngredientValidationResult): void {
    const hasNameError = validation.missingName || validation.invalidName;
    this.hasIngredientNameError.set(hasNameError);
    this.hasServingSizeError.set(validation.invalidServing);
    validation.isValid = !hasNameError && !validation.invalidServing;
    this.formFeedback.set(getIngredientValidationMessage(validation));
  }

  /** Saves a new ingredient or updates the active draft entry. */
  private persistIngredient(amountNumber: number, name: string): void {
    const editingEntryId = this.editingEntryId();
    const normalizedAmount = String(amountNumber);

    if (editingEntryId === null) {
      this.ingredientDraftState.addIngredient(name, normalizedAmount, this.selectedUnit());
      return;
    }

    this.ingredientDraftState.updateIngredient(editingEntryId, name, normalizedAmount, this.selectedUnit());
  }
}

type IngredientValidationResult = {
  name: string;
  amountNumber: number;
  missingName: boolean;
  invalidName: boolean;
  invalidServing: boolean;
  isValid: boolean;
};

/** Filters known ingredient suggestions for the current query. */
function getIngredientSuggestions(query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedQuery.length < 2
    ? []
    : KNOWN_INGREDIENTS.filter((ingredient) => ingredient.includes(normalizedQuery)).slice(0, 6);
}

/** Builds the ghost suggestion suffix for the current ingredient field value. */
function getIngredientSuggestionSuffix(currentValue: string, suggestions: string[]): string {
  const normalizedValue = currentValue.trim().toLowerCase();
  const firstSuggestion = suggestions[0];
  return canShowIngredientSuggestionSuffix(normalizedValue, firstSuggestion)
    ? firstSuggestion.slice(normalizedValue.length)
    : '';
}

/** Checks whether a ghost suggestion suffix should be shown. */
function canShowIngredientSuggestionSuffix(
  normalizedValue: string,
  firstSuggestion: string | undefined,
): boolean {
  return normalizedValue.length >= 2 && !!firstSuggestion && firstSuggestion.startsWith(normalizedValue);
}

/** Normalizes raw ingredient-name input to the accepted client-side format. */
function normalizeIngredientNameInput(value: string): string {
  return value.replaceAll(/[^a-zA-Z\s-]/g, '').replaceAll(/\s+/g, ' ').slice(0, 40);
}

/** Normalizes the raw serving-size field value. */
function normalizeServingSizeInput(value: string): string {
  const digitsOnlyValue = value.replaceAll(/\D/g, '').slice(0, 4);
  return digitsOnlyValue ? String(Math.max(1, Number.parseInt(digitsOnlyValue, 10))) : '';
}

/** Maps ingredient validation flags to the visible feedback message. */
function getIngredientValidationMessage(validation: IngredientValidationResult): string {
  if (validation.isValid) {
    return '';
  }

  return (
    getCombinedIngredientValidationMessage(validation) ??
    getSingleIngredientValidationMessage(validation)
  );
}

/** Returns the feedback message for combined ingredient-form validation errors. */
function getCombinedIngredientValidationMessage(validation: IngredientValidationResult): string | null {
  if (validation.missingName && validation.invalidServing) {
    return 'Please enter an ingredient and a serving size of at least 1.';
  }

  return validation.invalidName && validation.invalidServing
    ? 'Please enter a real ingredient and a serving size of at least 1.'
    : null;
}

/** Returns the feedback message for single-field ingredient-form validation errors. */
function getSingleIngredientValidationMessage(validation: IngredientValidationResult): string {
  if (validation.missingName) {
    return 'Please enter an ingredient.';
  }

  if (validation.invalidName) {
    return 'Please enter a real ingredient from the suggestions.';
  }

  return 'Please enter a serving size of at least 1.';
}

/** Checks whether a free-text ingredient name passes the client-side heuristics. */
function isKnownOrLikelyIngredientName(name: string): boolean {
  const normalizedName = name.trim().toLowerCase();

  if (hasBasicIngredientNameIssues(name, normalizedName)) {
    return false;
  }

  if (KNOWN_INGREDIENTS.includes(normalizedName)) {
    return true;
  }

  return hasLikelyIngredientPattern(normalizedName);
}

/** Rejects ingredient names that fail the basic client-side checks. */
function hasBasicIngredientNameIssues(name: string, normalizedName: string): boolean {
  return (
    normalizedName.length < 2 ||
    !/^[a-zA-Z\s-]+$/.test(name) ||
    BLOCKED_INGREDIENT_WORDS.includes(normalizedName)
  );
}

/** Applies the fallback heuristics for unknown but plausible ingredient names. */
function hasLikelyIngredientPattern(normalizedName: string): boolean {
  if (normalizedName.length < 4) {
    return false;
  }

  if (!normalizedName.includes(' ') && /(.)\1\1/.test(normalizedName)) {
    return false;
  }

  return (normalizedName.match(/[aeiou]/g) ?? []).length > 0;
}

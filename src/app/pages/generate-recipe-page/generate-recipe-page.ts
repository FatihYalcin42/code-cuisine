import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface IngredientEntry {
  id: number;
  name: string;
  amount: string;
  unit: string;
}

@Component({
  selector: 'app-generate-recipe-page',
  imports: [RouterLink],
  templateUrl: './generate-recipe-page.html',
  styleUrl: './generate-recipe-page.scss',
})
export class GenerateRecipePageComponent {
  protected readonly selectedUnit = signal('gram');
  protected readonly isUnitMenuOpen = signal(false);
  protected readonly ingredientName = signal('');
  protected readonly servingSizeValue = signal('');
  protected readonly ingredientEntries = signal<IngredientEntry[]>([]);
  protected readonly formFeedback = signal('');
  protected readonly hasIngredientNameError = signal(false);
  protected readonly hasServingSizeError = signal(false);
  private readonly unitOptions = ['gram', 'ml', 'piece'];
  private readonly editingEntryId = signal<number | null>(null);
  private nextEntryId = 1;
  protected readonly availableUnits = computed(() =>
    this.unitOptions.filter((unit) => unit !== this.selectedUnit()),
  );
  protected readonly ingredientNameSuggestions = computed(() =>
    this.ingredientEntries().map((entry) => entry.name),
  );
  protected readonly hasFormFeedback = computed(() => this.formFeedback().length > 0);
  protected readonly canShowNextStepButton = computed(() => this.ingredientEntries().length >= 2);

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
    this.ingredientName.set(value.slice(0, 40));
    this.hasIngredientNameError.set(false);

    if (this.hasFormFeedback()) {
      this.clearFormFeedback();
    }
  }

  /** Stores the current serving-size input value. */
  protected updateServingSizeValue(value: string): void {
    const digitsOnlyValue = value.replaceAll(/\D/g, '');

    if (!digitsOnlyValue) {
      this.servingSizeValue.set('');
      this.hasServingSizeError.set(false);
      return;
    }

    const normalizedValue = Math.max(1, Number.parseInt(digitsOnlyValue, 10));
    this.servingSizeValue.set(String(normalizedValue));
    this.hasServingSizeError.set(false);

    if (this.hasFormFeedback()) {
      this.clearFormFeedback();
    }
  }

  /** Adds a new ingredient entry or updates the currently edited one. */
  protected addIngredient(): void {
    const name = this.ingredientName().trim();
    const amount = this.servingSizeValue().trim();
    const amountNumber = Number.parseInt(amount, 10);
    const isIngredientNameMissing = !name;
    const isServingSizeInvalid = !amount || Number.isNaN(amountNumber) || amountNumber < 1;

    this.hasIngredientNameError.set(isIngredientNameMissing);
    this.hasServingSizeError.set(isServingSizeInvalid);

    if (isIngredientNameMissing || isServingSizeInvalid) {
      if (isIngredientNameMissing && isServingSizeInvalid) {
        this.formFeedback.set('Please enter an ingredient and a serving size of at least 1.');
      } else if (isIngredientNameMissing) {
        this.formFeedback.set('Please enter an ingredient.');
      } else {
        this.formFeedback.set('Please enter a serving size of at least 1.');
      }
      return;
    }

    const editingEntryId = this.editingEntryId();
    const entry: IngredientEntry = {
      id: editingEntryId ?? this.nextEntryId++,
      name,
      amount: String(amountNumber),
      unit: this.selectedUnit(),
    };

    if (editingEntryId === null) {
      this.ingredientEntries.update((entries) => [...entries, entry]);
    } else {
      this.ingredientEntries.update((entries) =>
        entries.map((currentEntry) => (currentEntry.id === editingEntryId ? entry : currentEntry)),
      );
    }

    this.resetIngredientForm();
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
    this.ingredientEntries.update((entries) =>
      entries.filter((currentEntry) => currentEntry.id !== entryId),
    );

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

  /** Clears transient validation feedback and field error states. */
  private clearFormFeedback(): void {
    this.formFeedback.set('');
    this.hasIngredientNameError.set(false);
    this.hasServingSizeError.set(false);
  }
}

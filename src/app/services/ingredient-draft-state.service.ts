import { Injectable, signal } from '@angular/core';

export interface IngredientEntry {
  id: number;
  name: string;
  amount: string;
  unit: string;
}

@Injectable({ providedIn: 'root' })
export class IngredientDraftStateService {
  readonly ingredientEntries = signal<IngredientEntry[]>([]);
  private nextEntryId = 1;

  /** Adds a new ingredient draft entry to the in-memory list. */
  addIngredient(name: string, amount: string, unit: string): void {
    const entry: IngredientEntry = {
      id: this.nextEntryId++,
      name,
      amount,
      unit,
    };

    this.ingredientEntries.update((entries) => [...entries, entry]);
  }

  /** Updates an existing ingredient draft entry in place. */
  updateIngredient(entryId: number, name: string, amount: string, unit: string): void {
    this.ingredientEntries.update((entries) =>
      entries.map((entry) =>
        entry.id === entryId
          ? {
              id: entryId,
              name,
              amount,
              unit,
            }
          : entry,
      ),
    );
  }

  /** Removes an ingredient draft entry from the current request state. */
  deleteIngredient(entryId: number): void {
    this.ingredientEntries.update((entries) =>
      entries.filter((entry) => entry.id !== entryId),
    );
  }

  /** Clears the current ingredient draft list after a successful recipe submission. */
  resetIngredients(): void {
    this.ingredientEntries.set([]);
    this.nextEntryId = 1;
  }
}

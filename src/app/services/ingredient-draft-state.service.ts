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

  addIngredient(name: string, amount: string, unit: string): void {
    const entry: IngredientEntry = {
      id: this.nextEntryId++,
      name,
      amount,
      unit,
    };

    this.ingredientEntries.update((entries) => [...entries, entry]);
  }

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

  deleteIngredient(entryId: number): void {
    this.ingredientEntries.update((entries) =>
      entries.filter((entry) => entry.id !== entryId),
    );
  }
}

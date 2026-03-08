import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-generate-recipe-page',
  imports: [RouterLink],
  templateUrl: './generate-recipe-page.html',
  styleUrl: './generate-recipe-page.scss',
})
export class GenerateRecipePageComponent {
  protected readonly selectedUnit = signal('gram');
  protected readonly isUnitMenuOpen = signal(false);
  private readonly unitOptions = ['gram', 'ml', 'piece'];
  protected readonly availableUnits = computed(() =>
    this.unitOptions.filter((unit) => unit !== this.selectedUnit()),
  );

  /** Toggles the serving-size unit dropdown. */
  protected toggleUnitMenu(): void {
    this.isUnitMenuOpen.update((isOpen) => !isOpen);
  }

  /** Selects a serving-size unit and closes the dropdown. */
  protected selectUnit(unit: string): void {
    this.selectedUnit.set(unit);
    this.isUnitMenuOpen.set(false);
  }
}

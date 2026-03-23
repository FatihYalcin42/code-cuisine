import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-preferences-page',
  imports: [RouterLink],
  templateUrl: './preferences-page.html',
  styleUrl: './preferences-page.scss',
})
export class PreferencesPageComponent {
  protected readonly portions = signal(2);
  protected readonly persons = signal(1);

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
}

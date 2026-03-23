import { Routes } from '@angular/router';
import { GenerateRecipePageComponent } from './pages/generate-recipe-page/generate-recipe-page';
import { HomePageComponent } from './pages/home-page/home-page';
import { PreferencesPageComponent } from './pages/preferences-page/preferences-page';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'generate-recipe', component: GenerateRecipePageComponent },
  { path: 'preferences', component: PreferencesPageComponent },
];

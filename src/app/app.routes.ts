import { Routes } from '@angular/router';
import { GenerateRecipePageComponent } from './pages/generate-recipe-page/generate-recipe-page';
import { HomePageComponent } from './pages/home-page/home-page';
import { LoadingPageComponent } from './pages/loading-page/loading-page';
import { PreferencesPageComponent } from './pages/preferences-page/preferences-page';
import { ResultsPageComponent } from './pages/results-page/results-page';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'generate-recipe', component: GenerateRecipePageComponent },
  { path: 'preferences', component: PreferencesPageComponent },
  { path: 'loading', component: LoadingPageComponent },
  { path: 'results', component: ResultsPageComponent },
];

import { Routes } from '@angular/router';
import { CookbookCategoryPageComponent } from './pages/cookbook-category-page/cookbook-category-page';
import { CookbookPageComponent } from './pages/cookbook-page/cookbook-page';
import { GenerateRecipePageComponent } from './pages/generate-recipe-page/generate-recipe-page';
import { HomePageComponent } from './pages/home-page/home-page';
import { LoadingPageComponent } from './pages/loading-page/loading-page';
import { PreparationPageComponent } from './pages/preparation-page/preparation-page';
import { PreferencesPageComponent } from './pages/preferences-page/preferences-page';
import { ResultsPageComponent } from './pages/results-page/results-page';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'cookbook', component: CookbookPageComponent },
  { path: 'cookbook/:category', component: CookbookCategoryPageComponent },
  { path: 'generate-recipe', component: GenerateRecipePageComponent },
  { path: 'preferences', component: PreferencesPageComponent },
  { path: 'loading', component: LoadingPageComponent },
  { path: 'results', component: ResultsPageComponent },
  { path: 'preparation', component: PreparationPageComponent },
];

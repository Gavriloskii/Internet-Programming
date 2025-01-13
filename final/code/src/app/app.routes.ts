import { Routes } from '@angular/router';
import { AuthorListComponent } from './author-list/author-list.component';
import { AuthorDetailsComponent } from './author-details/author-details.component';
import { AuthorEditComponent } from './author-edit/author-edit.component';
import { AuthorCreateComponent } from './author-create/author-create.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { AboutComponent } from './about/about.component';

export const routes: Routes = [
  { path: '', redirectTo: '/authors', pathMatch: 'full' }, // Redirect default route to authors
  { path: 'authors', component: AuthorListComponent }, // Author List Page
  { path: 'authors/:id', component: AuthorDetailsComponent }, // Author Details Page
  { path: 'authors/:id/edit', component: AuthorEditComponent }, // Author Edit Page
  { path: 'authors/create', component: AuthorCreateComponent }, // Author Create Page
  { path: 'statistics', component: StatisticsComponent }, // Statistics Page
  { path: 'about', component: AboutComponent }, // About Page
  { path: '**', redirectTo: '/authors' } // Wildcard route redirect
];

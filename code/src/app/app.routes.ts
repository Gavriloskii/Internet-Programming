import { Routes } from '@angular/router';
import { AuthorListComponent } from './author-list/author-list.component';
import { AuthorDetailsComponent } from './author-details/author-details.component';
import { AuthorEditComponent } from './author-edit/author-edit.component';
import { AuthorCreateComponent } from './author-create/author-create.component'; // Importing AuthorCreateComponent
import { StatisticsComponent } from './statistics/statistics.component'; // Importing StatisticsComponent
import { AboutComponent } from './about/about.component'; // Importing AboutComponent
import { BookCreateComponent } from './book-create/book-create.component'; // Importing BookCreateComponent

export const routes: Routes = [
    { path: '', redirectTo: 'authors', pathMatch: 'full' },
    { path: 'authors', component: AuthorListComponent },
    { path: 'authors/:id', component: AuthorDetailsComponent },
    { path: 'authors/:id/edit', component: AuthorEditComponent },
    { path: 'authors/create', component: AuthorCreateComponent }, // New route
    { path: 'statistics', component: StatisticsComponent }, // New route
    { path: 'about', component: AboutComponent }, // New route
    { path: 'authors/:id/books/create', component: BookCreateComponent }, // Bonus route
    { path: '**', redirectTo: 'authors' }
];

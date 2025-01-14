import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthorsService } from '../authors.service'; // Corrected import
import { Author } from '../models/author';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-author-list',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './author-list.component.html',
  styleUrls: ['./author-list.component.css']
})
export class AuthorListComponent implements OnInit {
  authors: Author[] = [];
  displayAuthors: Author[] = [];
  search: string = "";

  constructor(private authorsService: AuthorsService, private router: Router) { }

  ngOnInit() {
    this.loadAuthors();
  }

  loadAuthors(): void {
    this.authorsService.getAuthors().subscribe((authors: Author[]) => {
      this.authors = authors;
      this.displayAuthors = authors;
    });
  }

  filterAuthors() {
    const searchTerm = this.search.toLowerCase();
    this.displayAuthors = this.authors.filter(author => author.name.toLowerCase().includes(searchTerm));
  }

  editAuthor(authorId: number): void {
    this.router.navigate(['/authors/edit', authorId]);
  }

  deleteAuthor(authorId: number): void {
    this.authorsService.deleteAuthor(authorId).subscribe(() => {
      this.loadAuthors(); // Reload authors after deletion
    });
  }

  addAuthor(): void {
    this.router.navigate(['/authors/create']);
  }
}

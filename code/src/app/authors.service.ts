import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Author } from './models/author';
import { map } from 'rxjs/operators'; // Importing map operator

const BASE_URL = 'http://localhost:3000';

@Injectable({
  providedIn: 'root'
})
export class AuthorsService {
  
  createAuthor(author: Author) {
    const url = `${BASE_URL}/authors`;
    return this.http.post<Author>(url, author);
  }

  constructor(private http: HttpClient) { }

  getBookTypes() {
    const url = `${BASE_URL}/authors`;
    return this.http.get<Author[]>(url).pipe(
      map(authors => {
        const bookTypes = authors.flatMap(author => author.bibliography.map(book => book.type));
        return Array.from(new Set(bookTypes)); // Return unique book types
      })
    );
  }

  getAuthors() {
    const url = `${BASE_URL}/authors`;
    return this.http.get<Author[]>(url);
  }

  getAuthorById(id: number) {
    const url = `${BASE_URL}/authors/${id}`;
    return this.http.get<Author>(url);
  }

  getNationalities() {
    const url = `${BASE_URL}/nationalities`;
    return this.http.get<string[]>(url); // Assuming nationalities are returned as an array of strings
  }

  deleteAuthor(id: number) {
    const url = `${BASE_URL}/authors/${id}`;
    return this.http.delete(url);
  }

  updateAuthor(id: number, author: Author) {
    const url = `${BASE_URL}/authors/${id}`;
    return this.http.put<Author>(url, author);
  }
}
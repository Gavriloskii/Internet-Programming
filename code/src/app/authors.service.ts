import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Author } from './models/author';

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

  getAuthors() {
    const url = `${BASE_URL}/authors`;
    return this.http.get<Author[]>(url);
  }

  getAuthorById(id: number) {
    const url = `${BASE_URL}/authors/${id}`;
    return this.http.get<Author>(url);
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
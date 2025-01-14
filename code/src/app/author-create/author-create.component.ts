import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthorsServiceNew } from '../authors.service.new';
import { Author } from '../models/author';

@Component({
  selector: 'app-author-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './author-create.component.html',
  styleUrls: ['./author-create.component.css']
})
export class AuthorCreateComponent {
  author: Author = {
    id: 0,
    name: '',
    birth_date: '',
    nationality: '',
    bibliography: [],
    death_date: ''
  };
  errorMessage: string = '';

  constructor(private authorsService: AuthorsServiceNew) {}

  validateDates(): boolean {
    const birthDate = new Date(this.author.birth_date);
    const deathDate = this.author.death_date ? new Date(this.author.death_date) : null;

    // Check if birth date is valid
    if (isNaN(birthDate.getTime())) {
      this.errorMessage = 'Invalid birth date';
      return false;
    }

    // Check if death date is after birth date
    if (deathDate && deathDate <= birthDate) {
      this.errorMessage = 'Death date must be after birth date';
      return false;
    }

    this.errorMessage = '';
    return true;
  }

  onSubmit() {
    if (!this.validateDates()) {
      return;
    }

    this.authorsService.addAuthor(this.author).subscribe({
      next: (response: Author) => {
        console.log('Author added:', response);
        // Reset form
        this.author = {
          id: 0,
          name: '',
          birth_date: '',
          nationality: '',
          bibliography: [],
          death_date: ''
        };
      },
      error: (err: any) => {
        console.error('Error adding author:', err);
        this.errorMessage = 'Failed to add author. Please try again.';
      }
    });
  }
}

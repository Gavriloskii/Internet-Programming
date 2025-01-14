import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthorsService } from '../authors.service';
import { Author } from '../models/author';

@Component({
  selector: 'app-author-edit',
  templateUrl: './author-edit.component.html',
  styleUrls: ['./author-edit.component.css']
})
export class AuthorEditComponent implements OnInit {
  authorForm: FormGroup;
  authorId: number = 0; // Initialize to a default value

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private authorsService: AuthorsService
  ) {
    this.authorForm = this.fb.group({
      name: [''],
      bio: [''],
      // Add other fields as necessary
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.authorId = +idParam; // Convert to number
      this.authorsService.getAuthorById(this.authorId).subscribe((author: Author | null) => {
        if (author) {
          this.authorForm.patchValue(author);
        } else {
          // Handle the case where the author is not found
          console.error('Author not found');
          this.router.navigate(['/authors']);
        }
      });
    } else {
      console.error('No author ID provided');
      this.router.navigate(['/authors']);
    }
  }

  onSubmit(): void {
    this.authorsService.updateAuthor(this.authorId, this.authorForm.value).subscribe(() => {
      this.router.navigate(['/authors']);
    });
  }
}

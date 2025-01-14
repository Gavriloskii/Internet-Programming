import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router'; // Importing ActivatedRoute
import { of } from 'rxjs'; // Importing of from rxjs
import { AuthorsService } from '../authors.service'; // Importing AuthorsService

import { AuthorDetailsComponent } from './author-details.component';

describe('AuthorDetailsComponent', () => {
  let component: AuthorDetailsComponent;
  let fixture: ComponentFixture<AuthorDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorDetailsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '1' }) // Mocking a route parameter as an observable
          }
        },
        {
          provide: AuthorsService,
          useValue: {
            getAuthorById: () => of({ id: 1, name: 'Mock Author', bibliography: [] }) // Mocking the service method with bibliography
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthorDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

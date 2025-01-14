import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthorsService } from './authors.service';
import { Author } from './models/author';

describe('AuthorsService', () => {
  let service: AuthorsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(AuthorsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all authors', () => {
    const mockAuthors: Author[] = [
      {
        id: 1,
        name: 'Paolo Bacigalupi',
        birth_date: '1972-08-06',
        nationality: 'American',
        bibliography: []
      },
      {
        id: 2,
        name: 'New Author',
        birth_date: '1990-01-01',
        nationality: 'Unknown',
        bibliography: []
      }
    ];

    service.getAuthors().subscribe(authors => {
      expect(authors).toEqual(mockAuthors);
    });

    const req = httpMock.expectOne('http://localhost:3000/authors');
    expect(req.request.method).toBe('GET');
    req.flush(mockAuthors);
  });

  it('should fetch an author by ID', () => {
    const mockAuthor: Author = {
      id: 1,
      name: 'Paolo Bacigalupi',
      birth_date: '1972-08-06',
      nationality: 'American',
      bibliography: []
    };

    service.getAuthorById(1).subscribe(author => {
      expect(author).toEqual(mockAuthor);
    });

    const req = httpMock.expectOne('http://localhost:3000/authors/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockAuthor);
  });

  it('should create a new author', () => {
    const newAuthor: Author = {
      id: 2,
      name: 'New Author',
      birth_date: '1990-01-01',
      nationality: 'Unknown',
      bibliography: []
    };

    service.createAuthor(newAuthor).subscribe(author => {
      expect(author).toEqual(newAuthor);
    });

    const req = httpMock.expectOne('http://localhost:3000/authors');
    expect(req.request.method).toBe('POST');
    req.flush(newAuthor);
  });

  it('should update an existing author', () => {
    const updatedAuthor: Author = {
      id: 1,
      name: 'Updated Author',
      birth_date: '1972-08-06',
      nationality: 'American',
      bibliography: []
    };

    service.updateAuthor(1, updatedAuthor).subscribe(author => {
      expect(author).toEqual(updatedAuthor);
    });

    const req = httpMock.expectOne('http://localhost:3000/authors/1');
    expect(req.request.method).toBe('PUT');
    req.flush(updatedAuthor);
  });

  it('should delete an author by ID', () => {
    service.deleteAuthor(1).subscribe(response => {
      expect(response).toBeTruthy(); // Assuming the response is truthy on successful deletion
    });

    const req = httpMock.expectOne('http://localhost:3000/authors/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({}); // Simulate a successful deletion response
  });

  afterEach(() => {
    httpMock.verify();
  });
});

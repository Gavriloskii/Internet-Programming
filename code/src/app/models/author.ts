export interface Author {
    id: number;
    name: string;
    birth_date: string;
    nationality: string;
    bibliography: Book[];
    death_date?: string; // Optional death date
}

export interface Book {
    name: string;
    type: string;
    year: number;
}

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders welcome message', () => {
  render(<App />);
  const linkElement = screen.getByText(/Welcome to the App/i);
  expect(linkElement).toBeInTheDocument();
});

test('renders Sign Up button', () => {
  render(<App />);
  const buttonElement = screen.getByRole('button', { name: /Sign Up/i });
  expect(buttonElement).toBeInTheDocument();
});

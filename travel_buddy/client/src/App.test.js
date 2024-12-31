import { render, screen, fireEvent } from '@testing-library/react';
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

test('renders Sign Up form', () => {
  render(<App />);
  const usernameInput = screen.getByPlaceholderText(/Username/i);
  const emailInput = screen.getByPlaceholderText(/Email/i);
  const passwordInput = screen.getByPlaceholderText(/Password/i);
  
  expect(usernameInput).toBeInTheDocument();
  expect(emailInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();
});

test('renders Log In form', () => {
  render(<App />);
  const switchButton = screen.getByRole('button', { name: /Switch to Log In/i });
  fireEvent.click(switchButton);
  
  const passwordInput = screen.getByPlaceholderText(/Password/i);
  
  expect(passwordInput).toBeInTheDocument();
});

test('validates input fields', () => {
  render(<App />);
  const signUpButton = screen.getByRole('button', { name: /Sign Up/i });
  
  fireEvent.click(signUpButton);
  
  const usernameInput = screen.getByPlaceholderText(/Username/i);
  const emailInput = screen.getByPlaceholderText(/Email/i);
  const passwordInput = screen.getByPlaceholderText(/Password/i);
  
  fireEvent.change(usernameInput, { target: { value: '' } });
  fireEvent.change(emailInput, { target: { value: '' } });
  fireEvent.change(passwordInput, { target: { value: '' } });
  
  expect(usernameInput.value).toBe('');
  expect(emailInput.value).toBe('');
  expect(passwordInput.value).toBe('');
});
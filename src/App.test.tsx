import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders poker app setup screen', () => {
  render(<App />);
  // Should show the setup screen initially
  const gameNameInput = screen.getByPlaceholderText('Enter game name');
  expect(gameNameInput).toBeInTheDocument();
  
  // Should have create game button
  const createButton = screen.getByText(/create game/i);
  expect(createButton).toBeInTheDocument();
});

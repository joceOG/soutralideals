import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./routes/Dashboard', () => ({
  __esModule: true,
  default: function MockDashboard() {
    return <div data-testid="dashboard-shell">Soutrali Dashboard</div>;
  },
}));

test('monte App avec le thème et le shell dashboard', () => {
  render(<App />);
  expect(screen.getByTestId('dashboard-shell')).toBeInTheDocument();
  expect(screen.getByText(/Soutrali Dashboard/i)).toBeInTheDocument();
});

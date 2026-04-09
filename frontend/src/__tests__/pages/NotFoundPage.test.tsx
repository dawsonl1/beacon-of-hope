import { screen } from '@testing-library/react';
import { renderWithRouter } from '../helpers/renderWithProviders';
import NotFoundPage from '../../pages/NotFoundPage';

describe('NotFoundPage', () => {
  it('renders 404 heading', () => {
    renderWithRouter(<NotFoundPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders page not found message', () => {
    renderWithRouter(<NotFoundPage />);
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  it('renders a link to home', () => {
    renderWithRouter(<NotFoundPage />);
    const link = screen.getByRole('link', { name: /home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});

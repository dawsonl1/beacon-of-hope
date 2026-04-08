import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from '../../components/admin/Pagination';

describe('Pagination', () => {
  it('displays showing range and total count', () => {
    render(<Pagination page={1} pageSize={20} totalCount={50} onPageChange={() => {}} />);
    expect(screen.getByText(/Showing 1.20 of 50/)).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    render(<Pagination page={1} pageSize={20} totalCount={50} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    render(<Pagination page={3} pageSize={20} totalCount={50} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('calls onPageChange with correct page on Next click', async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pageSize={20} totalCount={50} onPageChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Next page'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with correct page on Previous click', async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} pageSize={20} totalCount={50} onPageChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Previous page'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('shows page number buttons', () => {
    render(<Pagination page={1} pageSize={20} totalCount={100} onPageChange={() => {}} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('handles zero total count', () => {
    render(<Pagination page={1} pageSize={20} totalCount={0} onPageChange={() => {}} />);
    expect(screen.getByText(/Showing 0.0 of 0/)).toBeInTheDocument();
  });
});

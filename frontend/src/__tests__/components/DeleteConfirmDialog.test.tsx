import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';

describe('DeleteConfirmDialog', () => {
  const defaultProps = {
    title: 'Delete Resident',
    message: 'Are you sure you want to delete this resident?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders title and message', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete Resident')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this resident?')).toBeInTheDocument();
  });

  it('has Cancel and Delete buttons', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onConfirm when Delete is clicked', async () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<DeleteConfirmDialog {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows Deleting... text when isDeleting is true', () => {
    render(<DeleteConfirmDialog {...defaultProps} isDeleting />);
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('disables buttons when isDeleting is true', () => {
    render(<DeleteConfirmDialog {...defaultProps} isDeleting />);
    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Deleting...')).toBeDisabled();
  });
});

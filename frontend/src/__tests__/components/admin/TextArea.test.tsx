import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TextArea from '../../../components/admin/TextArea';

describe('TextArea', () => {
  it('renders a textarea element', () => {
    render(<TextArea data-testid="ta" />);
    expect(screen.getByTestId('ta').tagName).toBe('TEXTAREA');
  });

  it('passes through standard textarea props', () => {
    render(
      <TextArea rows={5} placeholder="Write here..." data-testid="ta" />
    );
    const el = screen.getByTestId('ta') as HTMLTextAreaElement;
    expect(el.rows).toBe(5);
    expect(el.placeholder).toBe('Write here...');
  });

  it('calls onChange when user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextArea onChange={onChange} data-testid="ta" />);
    await user.type(screen.getByTestId('ta'), 'hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('merges custom className with base style', () => {
    render(<TextArea className="custom-class" data-testid="ta" />);
    const el = screen.getByTestId('ta');
    expect(el.className).toContain('custom-class');
  });

  it('renders with value', () => {
    render(<TextArea value="existing text" readOnly data-testid="ta" />);
    expect(screen.getByTestId('ta')).toHaveValue('existing text');
  });
});

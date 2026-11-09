import { Select } from '@tekcert/ui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const OPTIONS = [
  { value: 'earned', label: 'Most earned' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'level', label: 'Level' },
];

function setup() {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState('earned');
    return (
      <>
        <Select
          label="Sort:"
          value={value}
          options={OPTIONS}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
        />
        <button type="button">Elsewhere</button>
      </>
    );
  }
  render(<Harness />);
  return { onChange, user: userEvent.setup(), trigger: screen.getByRole('combobox') };
}

describe('Select', () => {
  it('is named by its label and shows the value', () => {
    const { trigger } = setup();
    expect(screen.getByRole('combobox', { name: 'Sort:' })).toHaveTextContent('Most earned');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('picks an option with the mouse', async () => {
    const { user, trigger, onChange } = setup();
    await user.click(trigger);
    expect(screen.getByRole('option', { name: 'Most earned' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('option', { name: 'Level' }));
    expect(onChange).toHaveBeenCalledWith('level');
    expect(trigger).toHaveTextContent('Level');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('does not report a change when the current option is picked again', async () => {
    const { user, trigger, onChange } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'Most earned' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('works from the keyboard, moving focus through the options', async () => {
    const { user, trigger, onChange } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Name A–Z' })).toHaveFocus());
    await user.keyboard('{End}');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Level' })).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('level');
  });

  it('closes on Escape without changing the value', async () => {
    const { user, trigger, onChange } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('jumps to an option by typing its first letters', async () => {
    const { user, trigger } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('le');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Level' })).toHaveFocus());
  });

  it('closes when clicking elsewhere', async () => {
    const { trigger } = setup();
    // While the list is open, Radix makes the rest of the page ignore the pointer.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

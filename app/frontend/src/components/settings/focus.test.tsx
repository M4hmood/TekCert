/** Dialogs opened from state give the focus back on closing (a bug found in S08). */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { EnrolmentSection } from './EnrolmentSection';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

it('gives focus back to the button that opened the year prompt', async () => {
  const user = userEvent.setup();
  render(
    <EnrolmentSection
      enrolment={{
        year: 4,
        group: 'A',
        specialty: 'CIM',
        targetSpecialty: null,
        classCode: 'ING-4-CIM-A',
        classmates: 1,
      }}
      alumni={false}
      academicYear={{ year: 2027, label: '2027-28', due: true }}
      specialties={[{ code: 'CIM', name: 'Cloud', hue: 225 }]}
      firstName="Y"
    />,
  );
  const confirm = screen.getByRole('button', { name: 'Confirm' });
  confirm.focus();
  await user.keyboard('{Enter}');
  await screen.findByRole('dialog');
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(confirm).toHaveFocus();
});

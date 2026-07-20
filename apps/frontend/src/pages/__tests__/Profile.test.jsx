import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAuth from '../../context/useAuth';
import useToast from '../../context/useToast';
import {
  changePassword,
  fetchProfile,
  get2FAStatus,
  updateProfile,
} from '../../services/userService';
import Profile from '../Profile';

vi.mock('../../context/useAuth');
vi.mock('../../context/useToast');
vi.mock('../../services/userService', () => ({
  changePassword: vi.fn(),
  disable2FA: vi.fn(),
  fetchProfile: vi.fn(),
  get2FAStatus: vi.fn(),
  setup2FA: vi.fn(),
  updateProfile: vi.fn(),
  verifySetup2FA: vi.fn(),
}));
vi.mock('../../components/NotificationSettings', () => ({
  default: () => <div>Notification settings</div>,
}));

const mockUser = {
  id: 'user-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phoneNumber: '+40712345678',
  role: 'technician',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
};
const setUser = vi.fn();
const showToast = vi.fn();

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Profile />
    </QueryClientProvider>
  );
}

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, setUser });
    useToast.mockReturnValue({ showToast });
    fetchProfile.mockResolvedValue(mockUser);
    get2FAStatus.mockResolvedValue({ enabled: false });
  });

  it('renders the authenticated user profile', async () => {
    renderProfile();

    expect(screen.getByRole('heading', { name: 'Profilul meu' })).toBeVisible();
    expect(screen.getByText('john.doe@example.com')).toBeVisible();
    expect(screen.getByText('+40712345678')).toBeVisible();
    expect(await screen.findByText('Notification settings')).toBeVisible();
  });

  it('exposes labelled fields in profile edit mode', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Editeaza' }));

    expect(screen.getByRole('textbox', { name: /^Prenume/ })).toHaveValue('John');
    expect(screen.getByRole('textbox', { name: /^Nume/ })).toHaveValue('Doe');
    expect(screen.getByRole('textbox', { name: /^Email/ })).toHaveValue('john.doe@example.com');
    expect(screen.getByRole('textbox', { name: 'Telefon' })).toHaveValue('+40712345678');
  });

  it('updates the profile through the current service contract', async () => {
    const user = userEvent.setup();
    const updatedUser = { ...mockUser, firstName: 'Jane' };
    updateProfile.mockResolvedValue(updatedUser);
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Editeaza' }));
    const firstName = screen.getByRole('textbox', { name: /^Prenume/ });
    await user.clear(firstName);
    await user.type(firstName, 'Jane');
    await user.click(screen.getByRole('button', { name: 'Salveaza modificarile' }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+40712345678',
      });
      expect(setUser).toHaveBeenCalledWith(updatedUser);
    });
  });

  it('validates an incomplete password change locally', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Schimba parola' }));
    await user.click(screen.getByRole('button', { name: 'Schimba parola' }));

    expect(await screen.findByText('Parola curenta este necesara')).toBeVisible();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes a valid password through the current service contract', async () => {
    const user = userEvent.setup();
    changePassword.mockResolvedValue({ success: true });
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Schimba parola' }));
    await user.type(screen.getByLabelText(/^Parola curenta/), 'OldPassword1');
    await user.type(screen.getByLabelText(/^Parola noua/), 'NewPassword2');
    await user.type(screen.getByLabelText(/^Confirma parola noua/), 'NewPassword2');
    await user.click(screen.getByRole('button', { name: 'Schimba parola' }));

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword2',
      });
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Parola schimbata', type: 'success' })
      );
    });
  });
});

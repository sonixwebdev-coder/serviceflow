/**
 * Profile Component Tests
 *
 * Note: These tests require Vitest and React Testing Library to be installed.
 * Run the following command to install dependencies:
 *
 * npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
 *
 * Then create vitest.config.js in apps/frontend/
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from '../Profile';
import * as useAuth from '../../context/useAuth';
import * as useToast from '../../context/useToast';
import * as userService from '../../services/userService';
import API from '../../utils/api';

// Mock dependencies
vi.mock('../../context/useAuth');
vi.mock('../../context/useToast');
vi.mock('../../services/userService');
vi.mock('../../utils/api');

describe('Profile Component', () => {
  const mockUser = {
    id: 'user-123',
    _id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+40712345678',
    role: 'technician',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockSetUser = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    useAuth.default.mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
    });

    useToast.default.mockReturnValue({
      showToast: mockShowToast,
    });
  });

  describe('Profile Display', () => {
    it('renders user profile information correctly', () => {
      render(<Profile />);

      expect(screen.getByText('Profilul meu')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('+40712345678')).toBeInTheDocument();
      expect(screen.getByText('technician')).toBeInTheDocument();
    });

    it('displays "Nespecificat" when phone number is missing', () => {
      useAuth.default.mockReturnValue({
        user: { ...mockUser, phoneNumber: null },
        setUser: mockSetUser,
      });

      render(<Profile />);

      expect(screen.getByText('Nespecificat')).toBeInTheDocument();
    });

    it('renders account status correctly', () => {
      render(<Profile />);

      expect(screen.getByText('Activ')).toBeInTheDocument();
    });

    it('formats creation date correctly', () => {
      render(<Profile />);

      // Romanian date format
      expect(screen.getByText(/ianuarie/i)).toBeInTheDocument();
    });
  });

  describe('Profile Editing', () => {
    it('shows edit form when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      expect(screen.getByLabelText(/Prenume/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nume/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Telefon/i)).toBeInTheDocument();
    });

    it('populates form with current user data', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+40712345678')).toBeInTheDocument();
    });

    it('allows editing form fields', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const firstNameInput = screen.getByLabelText(/Prenume/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    });

    it('cancels editing and restores original values', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const firstNameInput = screen.getByLabelText(/Prenume/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const cancelButton = screen.getByText('Anuleaza');
      await user.click(cancelButton);

      // Should show original value in view mode
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });

  describe('Profile Update', () => {
    it('successfully updates profile with valid data', async () => {
      const user = userEvent.setup();
      const updatedUser = {
        ...mockUser,
        firstName: 'Jane',
        email: 'jane.doe@example.com',
      };

      userService.updateUser.mockResolvedValue(updatedUser);

      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const firstNameInput = screen.getByLabelText(/Prenume/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const emailInput = screen.getByLabelText(/Email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'jane.doe@example.com');

      const saveButton = screen.getByText('Salveaza modificarile');
      await user.click(saveButton);

      await waitFor(() => {
        expect(userService.updateUser).toHaveBeenCalledWith(mockUser.id, {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
          phoneNumber: '+40712345678',
        });
      });

      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Profil actualizat',
        description: 'Informatiile tale au fost salvate cu succes.',
        type: 'success',
      });
    });

    it('shows validation error for empty first name', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const firstNameInput = screen.getByLabelText(/Prenume/i);
      await user.clear(firstNameInput);

      const saveButton = screen.getByText('Salveaza modificarile');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Prenume necesar',
          description: 'Te rugam sa introduci prenumele.',
          type: 'error',
        });
      });

      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('shows validation error for empty last name', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const lastNameInput = screen.getByLabelText(/Nume/i);
      await user.clear(lastNameInput);

      const saveButton = screen.getByText('Salveaza modificarile');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Nume necesar',
          description: 'Te rugam sa introduci numele.',
          type: 'error',
        });
      });

      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('shows validation error for invalid email', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const emailInput = screen.getByLabelText(/Email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      const saveButton = screen.getByText('Salveaza modificarile');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Email invalid',
          description: 'Te rugam sa introduci o adresa de email valida.',
          type: 'error',
        });
      });

      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('handles API error during profile update', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Email already in use';

      userService.updateUser.mockRejectedValue(new Error(errorMessage));

      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const firstNameInput = screen.getByLabelText(/Prenume/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      const saveButton = screen.getByText('Salveaza modificarile');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Eroare la salvare',
          description: errorMessage,
          type: 'error',
        });
      });
    });

    it('shows loading state during profile update', async () => {
      const user = userEvent.setup();
      userService.updateUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const saveButton = screen.getByText('Salveaza modificarile');
      await user.click(saveButton);

      expect(screen.getByText('Se salveaza...')).toBeInTheDocument();
    });
  });

  describe('Password Change', () => {
    it('shows password change form when button is clicked', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      expect(screen.getByLabelText(/Parola curenta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Parola noua/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirma parola noua/i)).toBeInTheDocument();
    });

    it('successfully changes password with valid data', async () => {
      const user = userEvent.setup();
      API.put.mockResolvedValue({ data: { success: true } });

      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      await user.type(screen.getByLabelText(/Parola curenta/i), 'OldPassword123');
      await user.type(screen.getByLabelText(/Parola noua/i), 'NewPassword456');
      await user.type(screen.getByLabelText(/Confirma parola noua/i), 'NewPassword456');

      const submitButton = screen.getByRole('button', { name: /Schimba parola/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(API.put).toHaveBeenCalledWith(`/users/${mockUser.id}`, {
          password: 'NewPassword456',
        });
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Parola schimbata',
        description: 'Parola ta a fost actualizata cu succes.',
        type: 'success',
      });
    });

    it('shows error when current password is missing', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      await user.type(screen.getByLabelText(/Parola noua/i), 'NewPassword456');
      await user.type(screen.getByLabelText(/Confirma parola noua/i), 'NewPassword456');

      const submitButton = screen.getByRole('button', { name: /Schimba parola/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Parola curenta este necesara')).toBeInTheDocument();
      });
    });

    it('shows error when new password is too short', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      await user.type(screen.getByLabelText(/Parola curenta/i), 'OldPassword123');
      await user.type(screen.getByLabelText(/Parola noua/i), 'Short1');
      await user.type(screen.getByLabelText(/Confirma parola noua/i), 'Short1');

      const submitButton = screen.getByRole('button', { name: /Schimba parola/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Parola trebuie sa aiba minim 8 caractere')).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      await user.type(screen.getByLabelText(/Parola curenta/i), 'OldPassword123');
      await user.type(screen.getByLabelText(/Parola noua/i), 'NewPassword456');
      await user.type(screen.getByLabelText(/Confirma parola noua/i), 'DifferentPassword789');

      const submitButton = screen.getByRole('button', { name: /Schimba parola/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Parolele nu se potrivesc')).toBeInTheDocument();
      });
    });

    it('shows error when new password is same as current', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      await user.type(screen.getByLabelText(/Parola curenta/i), 'SamePassword123');
      await user.type(screen.getByLabelText(/Parola noua/i), 'SamePassword123');
      await user.type(screen.getByLabelText(/Confirma parola noua/i), 'SamePassword123');

      const submitButton = screen.getByRole('button', { name: /Schimba parola/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Parola noua trebuie sa fie diferita de cea curenta')
        ).toBeInTheDocument();
      });
    });

    it('clears password form after successful change', async () => {
      const user = userEvent.setup();
      API.put.mockResolvedValue({ data: { success: true } });

      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      await user.type(screen.getByLabelText(/Parola curenta/i), 'OldPassword123');
      await user.type(screen.getByLabelText(/Parola noua/i), 'NewPassword456');
      await user.type(screen.getByLabelText(/Confirma parola noua/i), 'NewPassword456');

      const submitButton = screen.getByRole('button', { name: /Schimba parola/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(API.put).toHaveBeenCalled();
      });

      // Form should be hidden after successful change
      expect(screen.queryByLabelText(/Parola curenta/i)).not.toBeInTheDocument();
    });

    it('handles API error during password change', async () => {
      const user = userEvent.setup();
      API.put.mockRejectedValue(new Error('Current password is incorrect'));

      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      await user.type(screen.getByLabelText(/Parola curenta/i), 'WrongPassword');
      await user.type(screen.getByLabelText(/Parola noua/i), 'NewPassword456');
      await user.type(screen.getByLabelText(/Confirma parola noua/i), 'NewPassword456');

      const submitButton = screen.getByRole('button', { name: /Schimba parola/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: 'Eroare la schimbarea parolei',
          description: expect.stringContaining('Current password is incorrect'),
          type: 'error',
        });
      });
    });

    it('cancels password change and clears form', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const changePasswordButton = screen.getByText('Schimba parola');
      await user.click(changePasswordButton);

      await user.type(screen.getByLabelText(/Parola curenta/i), 'OldPassword123');

      const cancelButton = screen.getAllByText('Anuleaza')[1];
      await user.click(cancelButton);

      expect(screen.queryByLabelText(/Parola curenta/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      expect(screen.getByLabelText(/Prenume/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nume/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Telefon/i)).toBeInTheDocument();
    });

    it('has accessible buttons with icons and text', () => {
      render(<Profile />);

      expect(screen.getByRole('button', { name: /Editeaza/i })).toBeInTheDocument();
    });

    it('shows required field indicators', async () => {
      const user = userEvent.setup();
      render(<Profile />);

      const editButton = screen.getAllByText('Editeaza')[0];
      await user.click(editButton);

      const form = screen.getByLabelText(/Prenume/i).closest('form');
      const requiredIndicators = within(form).getAllByText('*');

      expect(requiredIndicators.length).toBeGreaterThan(0);
    });
  });
});

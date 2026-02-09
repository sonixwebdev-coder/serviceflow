import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Lock, Save, X, Edit2 } from 'lucide-react';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import { updateProfile, changePassword } from '../services/userService';
import NotificationSettings from '../components/NotificationSettings';

const Profile = () => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  // Personal Information State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change State
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  // Initialize profile form when user data loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user]);

  // Handle profile input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user types
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Validate profile form
  const validateProfileForm = () => {
    if (!profileForm.firstName.trim()) {
      showToast({
        title: 'Prenume necesar',
        description: 'Te rugam sa introduci prenumele.',
        type: 'error',
      });
      return false;
    }

    if (!profileForm.lastName.trim()) {
      showToast({
        title: 'Nume necesar',
        description: 'Te rugam sa introduci numele.',
        type: 'error',
      });
      return false;
    }

    if (!profileForm.email.trim()) {
      showToast({
        title: 'Email necesar',
        description: 'Te rugam sa introduci adresa de email.',
        type: 'error',
      });
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email)) {
      showToast({
        title: 'Email invalid',
        description: 'Te rugam sa introduci o adresa de email valida.',
        type: 'error',
      });
      return false;
    }

    return true;
  };

  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Parola curenta este necesara';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'Parola noua este necesara';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Parola trebuie sa aiba minim 8 caractere';
    } else if (!/[a-z]/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Parola trebuie sa contina cel putin o litera mica';
    } else if (!/[A-Z]/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Parola trebuie sa contina cel putin o litera mare';
    } else if (!/[0-9]/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Parola trebuie sa contina cel putin o cifra';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Confirmarea parolei este necesara';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Parolele nu se potrivesc';
    }

    if (passwordForm.currentPassword && passwordForm.newPassword &&
        passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'Parola noua trebuie sa fie diferita de cea curenta';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!validateProfileForm()) {
      return;
    }

    setIsSavingProfile(true);

    try {
      const updatedUser = await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        phoneNumber: profileForm.phoneNumber || undefined,
      });

      // Update the user context and persist minimal display fields to localStorage
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify({
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
      }));

      showToast({
        title: 'Profil actualizat',
        description: 'Informatiile tale au fost salvate cu succes.',
        type: 'success',
      });

      setIsEditingProfile(false);
    } catch (error) {
      showToast({
        title: 'Eroare la salvare',
        description: error.message || 'Nu s-au putut salva modificarile. Te rugam sa incerci din nou.',
        type: 'error',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cancel profile editing
  const handleCancelProfile = () => {
    setProfileForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
    });
    setIsEditingProfile(false);
  };

  // Save password changes
  const handleSavePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    setIsSavingPassword(true);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      showToast({
        title: 'Parola schimbata',
        description: 'Parola ta a fost actualizata cu succes.',
        type: 'success',
      });

      // Reset password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsEditingPassword(false);
    } catch (error) {
      showToast({
        title: 'Eroare la schimbarea parolei',
        description: error.message || 'Nu s-a putut schimba parola. Verifica parola curenta si incearca din nou.',
        type: 'error',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Cancel password editing
  const handleCancelPassword = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordErrors({});
    setIsEditingPassword(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-viperx-primary text-lg font-bold text-white">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profilul meu</h1>
          <p className="text-sm text-gray-500">Gestioneaza-ti informatiile personale si securitatea contului</p>
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Informatii personale</h2>
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Edit2 size={16} />
              Editeaza
            </button>
          )}
        </div>

        {!isEditingProfile ? (
          // View Mode
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Prenume</label>
                <p className="mt-1 text-base text-gray-900">{user?.firstName || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nume</label>
                <p className="mt-1 text-base text-gray-900">{user?.lastName || '—'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                Email
              </label>
              <p className="text-base text-gray-900">{user?.email || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                Telefon
              </label>
              <p className="text-base text-gray-900">{user?.phoneNumber || 'Nespecificat'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <p className="mt-1 text-base capitalize text-gray-900">{user?.role || '—'}</p>
            </div>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Prenume <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileForm.firstName}
                  onChange={handleProfileChange}
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  placeholder="Ion"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nume <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileForm.lastName}
                  onChange={handleProfileChange}
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                  placeholder="Popescu"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                maxLength={255}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                placeholder="ion.popescu@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={profileForm.phoneNumber}
                onChange={handleProfileChange}
                maxLength={20}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                placeholder="+40712345678"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={isSavingProfile}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={16} />
                Anuleaza
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {isSavingProfile ? 'Se salveaza...' : 'Salveaza modificarile'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Change Password Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Schimba parola</h2>
            <p className="text-sm text-gray-500 mt-1">
              Pastreaza-ti contul in siguranta prin actualizarea periodica a parolei
            </p>
          </div>
          {!isEditingPassword && (
            <button
              type="button"
              onClick={() => setIsEditingPassword(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Lock size={16} />
              Schimba parola
            </button>
          )}
        </div>

        {!isEditingPassword ? (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Lock size={20} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Parola este protejata</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Apasa butonul "Schimba parola" pentru a actualiza parola contului tau
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSavePassword(); }} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Parola curenta <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                maxLength={128}
                className={`w-full rounded-lg border ${passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary`}
                placeholder="Introdu parola curenta"
              />
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Parola noua <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                maxLength={128}
                className={`w-full rounded-lg border ${passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary`}
                placeholder="Minim 8 caractere"
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Parola trebuie sa contina minim 8 caractere, o litera mica, o litera mare si o cifra
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirma parola noua <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                maxLength={128}
                className={`w-full rounded-lg border ${passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary`}
                placeholder="Introdu din nou parola noua"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancelPassword}
                disabled={isSavingPassword}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={16} />
                Anuleaza
              </button>
              <button
                type="submit"
                disabled={isSavingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {isSavingPassword ? 'Se schimba...' : 'Schimba parola'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informatii cont</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Tip cont</span>
            <span className="font-medium capitalize text-gray-900">{user?.role || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Status</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.isActive ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
              {user?.isActive ? 'Activ' : 'Inactiv'}
            </span>
          </div>
          {user?.createdAt && (
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                Membru din
              </span>
              <span className="font-medium text-gray-900">
                {new Date(user.createdAt).toLocaleDateString('ro-RO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notificari Push</h2>
        <p className="text-sm text-gray-500 mb-6">
          Gestioneaza preferintele pentru notificarile push in browser
        </p>
        <NotificationSettings />
      </div>
    </div>
  );
};

export default Profile;

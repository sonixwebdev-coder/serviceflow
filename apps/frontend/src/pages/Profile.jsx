import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Lock, Save, X, Edit2, ShieldCheck, ShieldOff, Copy, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import { updateProfile, changePassword, fetchProfile, get2FAStatus, setup2FA, verifySetup2FA, disable2FA } from '../services/userService';
import NotificationSettings from '../components/NotificationSettings';

const Profile = () => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  // Fetch full profile data (includes phoneNumber, createdAt, etc.)
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: Boolean(user),
  });

  // Personal Information State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 2FA State
  const [twoFAState, setTwoFAState] = useState('idle'); // idle | loading | setup | verify | enabled | disabling
  const [qrData, setQrData] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });

  const { data: twoFAStatus, refetch: refetchTwoFA } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: get2FAStatus,
    enabled: Boolean(user),
  });

  // Password Change State
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  // Initialize profile form when profile data loads
  useEffect(() => {
    const source = profile || user;
    if (source) {
      setProfileForm({
        firstName: source.firstName || '',
        lastName: source.lastName || '',
        email: source.email || '',
        phoneNumber: source.phoneNumber || '',
      });
    }
  }, [profile, user]);

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
    const source = profile || user;
    setProfileForm({
      firstName: source.firstName || '',
      lastName: source.lastName || '',
      email: source.email || '',
      phoneNumber: source.phoneNumber || '',
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
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
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
                <p className="mt-1 text-base text-gray-900">{user?.firstName || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nume</label>
                <p className="mt-1 text-base text-gray-900">{user?.lastName || '-'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                Email
              </label>
              <p className="text-base text-gray-900">{user?.email || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                Telefon
              </label>
              <p className="text-base text-gray-900">{profile?.phoneNumber || user?.phoneNumber || 'Nespecificat'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <p className="mt-1 text-base capitalize text-gray-900">{user?.role || '-'}</p>
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="+40712345678"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
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
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                className={`w-full rounded-lg border ${passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
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
                className={`w-full rounded-lg border ${passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
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
                className={`w-full rounded-lg border ${passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
                placeholder="Introdu din nou parola noua"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
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
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {isSavingPassword ? 'Se schimba...' : 'Schimba parola'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Autentificare in doi pasi (2FA)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Adauga un nivel suplimentar de securitate contului tau
            </p>
          </div>
          {twoFAStatus?.enabled && twoFAState === 'idle' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
              <ShieldCheck size={14} />
              Activat
            </span>
          )}
        </div>

        {/* Not enabled - show activate button */}
        {!twoFAStatus?.enabled && twoFAState === 'idle' && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldOff size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">2FA nu este activat</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Protejeaza-ti contul cu un cod din aplicatia de autentificare
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setTwoFAState('loading');
                  try {
                    const data = await setup2FA();
                    setQrData(data);
                    setTwoFAState('setup');
                  } catch (err) {
                    showToast({ title: 'Eroare', description: err.message || 'Nu s-a putut initializa 2FA', type: 'error' });
                    setTwoFAState('idle');
                  }
                }}
                disabled={twoFAState === 'loading'}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                {twoFAState === 'loading' ? 'Se incarca...' : 'Activeaza 2FA'}
              </button>
            </div>
          </div>
        )}

        {/* Setup - show QR code */}
        {twoFAState === 'setup' && qrData && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
              Scaneaza codul QR cu aplicatia ta de autentificare (Google Authenticator, Authy, etc.)
            </div>
            <div className="flex flex-col items-center gap-4">
              <img src={qrData.qrCodeDataUrl} alt="QR Code 2FA" className="w-48 h-48" />
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Sau introdu manual acest cod:</p>
                <code className="block bg-gray-100 rounded px-3 py-1.5 text-sm font-mono text-gray-800 select-all">
                  {qrData.secret}
                </code>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Introdu codul din aplicatie pentru confirmare
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-center tracking-widest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!twoFACode.trim()) return;
                    setTwoFAState('loading');
                    try {
                      const result = await verifySetup2FA(twoFACode);
                      setBackupCodes(result.backupCodes);
                      setTwoFACode('');
                      setTwoFAState('enabled');
                      refetchTwoFA();
                      showToast({ title: '2FA activat', description: 'Autentificarea in doi pasi a fost activata cu succes.', type: 'success' });
                    } catch (err) {
                      showToast({ title: 'Cod invalid', description: err.message || 'Codul nu este corect. Incearca din nou.', type: 'error' });
                      setTwoFAState('setup');
                    }
                  }}
                  disabled={twoFAState === 'loading' || !twoFACode.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium whitespace-nowrap transition disabled:opacity-50"
                >
                  Confirma
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setTwoFAState('idle'); setQrData(null); setTwoFACode(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Anuleaza
            </button>
          </div>
        )}

        {/* Backup codes shown after enabling */}
        {twoFAState === 'enabled' && backupCodes && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
              Salveaza aceste coduri de recuperare intr-un loc sigur. Le poti folosi pentru a te conecta daca pierzi accesul la aplicatia de autentificare. Fiecare cod poate fi folosit o singura data.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto">
              {backupCodes.map((code, i) => (
                <code key={i} className="bg-gray-100 rounded px-3 py-1.5 text-sm font-mono text-center text-gray-800">
                  {code}
                </code>
              ))}
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join('\n'));
                  showToast({ title: 'Copiat', description: 'Codurile au fost copiate in clipboard.', type: 'success' });
                }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                <Copy size={14} />
                Copiaza
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([`ForjaIt - Coduri de recuperare 2FA\n\n${backupCodes.join('\n')}\n`], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'forjait-backup-codes.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                <Download size={14} />
                Descarca
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setBackupCodes(null); setTwoFAState('idle'); }}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              Am salvat codurile
            </button>
          </div>
        )}

        {/* Enabled state - show disable option */}
        {twoFAStatus?.enabled && twoFAState === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-700">2FA este activat</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Contul tau este protejat cu autentificare in doi pasi
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTwoFAState('disabling')}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition"
            >
              <ShieldOff size={16} />
              Dezactiveaza 2FA
            </button>
          </div>
        )}

        {/* Disable form */}
        {twoFAState === 'disabling' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              Pentru a dezactiva 2FA, introdu parola si un cod din aplicatia de autentificare.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parola</label>
              <input
                type="password"
                value={disableForm.password}
                onChange={(e) => setDisableForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Parola contului"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cod 2FA</label>
              <input
                type="text"
                inputMode="numeric"
                value={disableForm.code}
                onChange={(e) => setDisableForm(prev => ({ ...prev, code: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-center tracking-widest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => { setTwoFAState('idle'); setDisableForm({ password: '', code: '' }); }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <X size={16} />
                Anuleaza
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!disableForm.password || !disableForm.code) return;
                  try {
                    await disable2FA(disableForm.password, disableForm.code);
                    setTwoFAState('idle');
                    setDisableForm({ password: '', code: '' });
                    refetchTwoFA();
                    showToast({ title: '2FA dezactivat', description: 'Autentificarea in doi pasi a fost dezactivata.', type: 'success' });
                  } catch (err) {
                    showToast({ title: 'Eroare', description: err.message || 'Nu s-a putut dezactiva 2FA', type: 'error' });
                  }
                }}
                disabled={!disableForm.password || !disableForm.code}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                Dezactiveaza
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informatii cont</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Tip cont</span>
            <span className="font-medium capitalize text-gray-900">{user?.role || '-'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Status</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.isActive ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
              {user?.isActive ? 'Activ' : 'Inactiv'}
            </span>
          </div>
          {(profile?.createdAt || user?.createdAt) && (
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                Membru din
              </span>
              <span className="font-medium text-gray-900">
                {new Date(profile?.createdAt || user.createdAt).toLocaleDateString('ro-RO', {
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

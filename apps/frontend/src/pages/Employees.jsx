import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { X, UserPlus, Mail, Phone, Calendar, Shield, CheckCircle, Umbrella } from 'lucide-react';
import useUsers from '../hooks/useUsers';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import DatePicker from '../components/ui/DatePicker';
import ExportButton from '../components/ExportButton';
import { createUser, deactivateUser, updateUser } from '../services/userService';
import { USER_ROLES } from '../utils/constants';

const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.TECHNICIAN]: 'Tehnician',
  [USER_ROLES.SALES]: 'Vanzari',
};

const initialFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: null,
  role: USER_ROLES.TECHNICIAN,
  password: '',
};

const Employees = () => {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();

  const isAdmin = hasRole(USER_ROLES.ADMIN);
  const userId = user?._id || user?.id;

  const [filters, setFilters] = useState({ isActive: true });
  const { users, loading, error, setFilters: setHookFilters, refresh } = useUsers(filters, { enabled: isAdmin });

  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit'
  const [formState, setFormState] = useState(initialFormState);
  const [targetUser, setTargetUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const roles = useMemo(() => {
    // Use unique values to avoid duplicates from backward compatibility aliases
    return [...new Set(Object.values(USER_ROLES))];
  }, []);

  // Close modal on ESC key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && modalMode) {
        closeModal();
      }
    };

    if (modalMode) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [modalMode]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    const next = { ...filters, [name]: value || undefined };
    setFilters(next);
    setHookFilters(next);
  };

  const openCreateModal = () => {
    setFormState(initialFormState);
    setTargetUser(null);
    setModalMode('create');
  };

  const openEditModal = (employee) => {
    setTargetUser(employee);
    setFormState({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phoneNumber: employee.phoneNumber || '',
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
      role: employee.role,
      password: '',
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setTargetUser(null);
    setFormState(initialFormState);
    setSaving(false);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormState((current) => ({
      ...current,
      dateOfBirth: date,
    }));
  };

  const buildPayload = () => {
    const payload = {
      firstName: formState.firstName,
      lastName: formState.lastName,
      email: formState.email,
      phoneNumber: formState.phoneNumber,
      role: formState.role,
    };

    if (formState.dateOfBirth) {
      payload.dateOfBirth = format(formState.dateOfBirth, 'yyyy-MM-dd');
    }

    const password = formState.password?.trim();
    if (password) {
      payload.password = password;
    }

    return payload;
  };

  const handleSave = async () => {
    if (!modalMode) return;

    const payload = buildPayload();

    if (modalMode === 'create' && !payload.password) {
      showToast({
        title: 'Parola necesara',
        description: 'Seteaza o parola initiala pentru angajat.',
        type: 'error',
      });
      return;
    }

    setSaving(true);

   try {
     if (modalMode === 'create') {
       await createUser(payload);
       showToast({
         title: 'Angajat adaugat',
         description: 'Angajatul a fost adaugat cu succes.',
         type: 'success',
       });
     } else if (targetUser) {
       await updateUser(targetUser._id, payload);
       showToast({
         title: 'Angajat actualizat',
         description: 'Modificarile au fost salvate.',
         type: 'success',
       });
     }

     await refresh();
     closeModal();
    } catch (submitError) {
      showToast({
        title: 'Salvarea a esuat',
        description: submitError.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (employeeId) => {
    if (!window.confirm('Esti sigur ca vrei sa dezactivezi acest utilizator?')) {
      return;
    }
    try {
      await deactivateUser(employeeId);
      await refresh();
      showToast({
        title: 'Angajat dezactivat',
        description: 'Accesul a fost revocat cu succes.',
        type: 'success',
      });
    } catch (deactivateError) {
      showToast({
        title: 'Dezactivarea a esuat',
        description: deactivateError.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl bg-white p-6 text-center text-gray-600">
        Nu ai permisiunea de a vizualiza aceasta pagina.
      </div>
    );
  }

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prenume *</label>
          <input
            name="firstName"
            value={formState.firstName}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
            placeholder="Ion"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
          <input
            name="lastName"
            value={formState.lastName}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
            placeholder="Popescu"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          type="email"
          name="email"
          value={formState.email}
          onChange={handleInputChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
          placeholder="ion.popescu@viperx.ro"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
          <input
            name="phoneNumber"
            value={formState.phoneNumber}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
            placeholder="+40712345678"
            required
          />
        </div>
        <div>
          <DatePicker
            label="Data nasterii"
            value={formState.dateOfBirth}
            onChange={handleDateChange}
            placeholder="Optional"
            maxDate={new Date()}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
          <select
            name="role"
            value={formState.role}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {modalMode === 'create' ? 'Parola *' : 'Reseteaza parola'}
          </label>
          <input
            type="password"
            name="password"
            value={formState.password}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
            placeholder={modalMode === 'create' ? 'Parola temporara' : 'Lasa gol pentru a pastra'}
            required={modalMode === 'create'}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Angajati</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestioneaza profilurile angajatilor si nivelurile de acces.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            entityType="users"
            filters={{
              isActive: filters.isActive,
              role: filters.role,
            }}
          />
          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              <UserPlus size={18} />
              Adauga angajat
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Filtre</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              name="role"
              value={filters.role || ''}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
            >
              <option value="">Toate rolurile</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="isActive"
              value={filters.isActive?.toString() ?? 'true'}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
            >
              <option value="true">Activ</option>
              <option value="false">Inactiv</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Directorul echipei</h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-sm text-red-600">{error}</div>
          ) : users.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">Niciun angajat gasit.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nume</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Concediu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Cont</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((employee) => {
                  const canEdit = isAdmin || employee._id === userId;
                  return (
                    <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-viperx-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-viperx-primary">
                              {employee.firstName?.[0]}{employee.lastName?.[0]}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              Angajat din: {employee.createdAt ? format(new Date(employee.createdAt), 'dd MMM yyyy', { locale: roDateLocale }) : '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {employee.leaveStatus === 'DISPONIBIL' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Disponibil
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            <Umbrella className="h-3 w-3" />
                            In concediu
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Mail size={14} className="text-gray-400" />
                            {employee.email}
                          </div>
                          {employee.phoneNumber && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Phone size={14} className="text-gray-400" />
                              {employee.phoneNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                          <Shield size={12} />
                          {ROLE_LABELS[employee.role] || employee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.isActive ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                          {employee.isActive ? 'Activ' : 'Inactiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-3">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(employee)}
                              className="text-viperx-primary hover:text-orange-600 font-medium transition"
                            >
                              Editeaza
                            </button>
                          )}
                          {isAdmin && employee.isActive && employee._id !== userId && (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(employee._id)}
                              className="text-red-600 hover:text-red-700 font-medium transition"
                            >
                              Dezactiveaza
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-sm text-red-600">{error}</div>
          ) : users.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">Niciun angajat gasit.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((employee) => {
                const canEdit = isAdmin || employee._id === userId;
                return (
                  <div key={employee._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-viperx-primary/10 flex items-center justify-center">
                          <span className="text-base font-semibold text-viperx-primary">
                            {employee.firstName?.[0]}{employee.lastName?.[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900 mb-1">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {employee.leaveStatus === 'DISPONIBIL' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                <CheckCircle className="h-3 w-3" />
                                Disponibil
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                <Umbrella className="h-3 w-3" />
                                In concediu
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${employee.isActive ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'}`}>
                              {employee.isActive ? 'Activ' : 'Inactiv'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail size={14} className="text-gray-400" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        {employee.phoneNumber && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {employee.phoneNumber}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <Shield size={14} className="text-gray-400" />
                          {ROLE_LABELS[employee.role] || employee.role}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={14} className="text-gray-400" />
                          Angajat din: {employee.createdAt ? format(new Date(employee.createdAt), 'dd MMM yyyy', { locale: roDateLocale }) : '—'}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEditModal(employee)}
                            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                          >
                            Editeaza
                          </button>
                        )}
                        {isAdmin && employee.isActive && employee._id !== userId && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(employee._id)}
                            className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                          >
                            Dezactiveaza
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ margin: 0 }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
            style={{ margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Adauga angajat' : `Editeaza ${targetUser?.firstName}`}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4">
              {renderForm()}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Anuleaza
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Se salveaza...' : modalMode === 'create' ? 'Creaza' : 'Salveaza'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Car, Settings2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useProfile, useUpdateProfile, useVehicles, useAssets } from '@/hooks/useProfile';
import { useChangePassword } from '@/hooks/useAuth';
import { useAuthStore } from '@/state/useAuthStore';

const profileSchema = z.object({
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Parola curenta este obligatorie'),
  newPassword: z.string().min(6, 'Parola noua trebuie sa aiba minim 6 caractere'),
  confirmPassword: z.string().min(1, 'Confirmarea parolei este obligatorie'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Parolele nu coincid',
  path: ['confirmPassword'],
});

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  const client = useAuthStore((state) => state.client);
  const { data: profile } = useProfile();
  const { data: vehicles } = useVehicles();
  const { data: assets } = useAssets();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  // Get service type from organization settings
  const serviceType = client?.organization?.serviceType || 'VEHICLE';

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      phone: profile?.phone || '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data) => {
    changePasswordMutation.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          passwordForm.reset();
        },
      }
    );
  };

  // Build tabs based on service type - only show relevant asset tab
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'profile', label: 'Profil', icon: User },
    ];

    // Show Vehicle or Asset tab based on organization service type
    if (serviceType === 'VEHICLE') {
      baseTabs.push({ id: 'vehicles', label: 'Vehicule', icon: Car });
    } else if (serviceType === 'ASSET') {
      baseTabs.push({ id: 'assets', label: 'Echipamente', icon: Settings2 });
    }
    // For GENERAL, don't show either tab

    baseTabs.push({ id: 'security', label: 'Securitate', icon: Lock });
    return baseTabs;
  }, [serviceType]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profilul meu</h1>
        <p className="mt-1 text-gray-500">Gestioneaza informatiile contului tau</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic info (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>Informatii generale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Nume</label>
                <p className="font-medium">
                  {client?.companyName || `${client?.firstName || ''} ${client?.lastName || ''}`.trim()}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium">{client?.email}</p>
              </div>
              {profile?.vatNumber && (
                <div>
                  <label className="text-sm text-gray-500">CUI</label>
                  <p className="font-medium">{profile.vatNumber}</p>
                </div>
              )}
              {profile?.registrationNumber && (
                <div>
                  <label className="text-sm text-gray-500">Nr. Reg. Com.</label>
                  <p className="font-medium">{profile.registrationNumber}</p>
                </div>
              )}
              {profile?.fidelityCardSerie && (
                <div>
                  <label className="text-sm text-gray-500">Card fidelitate</label>
                  <p className="font-medium">{profile.fidelityCardSerie}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact info (editable) */}
          <Card>
            <CardHeader>
              <CardTitle>Date de contact</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div>
                  <label className="label">Telefon</label>
                  <Input {...profileForm.register('phone')} placeholder="Telefon" />
                </div>
                <Button type="submit" isLoading={updateProfileMutation.isPending}>
                  Salveaza modificarile
                </Button>
                {updateProfileMutation.isSuccess && (
                  <p className="text-sm text-green-600">Profil actualizat cu succes!</p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vehicles tab */}
      {activeTab === 'vehicles' && (
        <Card>
          <CardHeader>
            <CardTitle>Vehiculele mele</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!vehicles?.length ? (
              <div className="p-6 text-center text-gray-500">Nu exista vehicule inregistrate</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                    </p>
                    <p className="text-sm text-gray-500">Numar: {vehicle.plateNumber}</p>
                    {vehicle.vin && <p className="text-sm text-gray-500">VIN: {vehicle.vin}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assets tab */}
      {activeTab === 'assets' && (
        <Card>
          <CardHeader>
            <CardTitle>Echipamentele mele</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!assets?.length ? (
              <div className="p-6 text-center text-gray-500">Nu exista echipamente inregistrate</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {assets.map((asset) => (
                  <div key={asset.id} className="px-6 py-4">
                    <p className="font-medium text-gray-900">{asset.name}</p>
                    <p className="text-sm text-gray-500">Tip: {asset.type}</p>
                    {asset.manufacturer && <p className="text-sm text-gray-500">Producator: {asset.manufacturer}</p>}
                    {asset.model && <p className="text-sm text-gray-500">Model: {asset.model}</p>}
                    {asset.identifier && (
                      <p className="text-sm text-gray-500">Identificator: {asset.identifier}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Schimba parola</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              {changePasswordMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {changePasswordMutation.error?.response?.data?.error || 'Eroare la schimbarea parolei'}
                </div>
              )}
              {changePasswordMutation.isSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  Parola a fost schimbata cu succes!
                </div>
              )}
              <div>
                <label className="label">Parola curenta</label>
                <Input
                  type="password"
                  {...passwordForm.register('currentPassword')}
                  error={passwordForm.formState.errors.currentPassword}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Parola noua</label>
                <Input
                  type="password"
                  {...passwordForm.register('newPassword')}
                  error={passwordForm.formState.errors.newPassword}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Confirma parola noua</label>
                <Input
                  type="password"
                  {...passwordForm.register('confirmPassword')}
                  error={passwordForm.formState.errors.confirmPassword}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" isLoading={changePasswordMutation.isPending}>
                Schimba parola
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

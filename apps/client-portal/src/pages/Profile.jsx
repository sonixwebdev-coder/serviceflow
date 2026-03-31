import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Car, Package, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useProfile, useUpdateProfile, useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useProfile';
import { useChangePassword } from '@/hooks/useAuth';
import { useAuthStore } from '@/state/useAuthStore';
import useToast from '@/context/useToast';

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
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deletingAsset, setDeletingAsset] = useState(null);

  const client = useAuthStore((state) => state.client);
  const { data: profile } = useProfile();
  const { data: assets } = useAssets();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const { showToast } = useToast();

  // Get sector config from organization
  const sectorConfig = client?.organization?.sectorConfig;
  const hasAssets = sectorConfig?.hasAssets || false;
  const assetType = sectorConfig?.assetType;
  const assetTerminology = sectorConfig?.terminology?.asset || { singular: 'Activ', plural: 'Active', identifier: 'Identificator' };

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

  // Asset form state
  const [assetForm, setAssetForm] = useState({
    name: '',
    identifier: '',
    type: '',
    manufacturer: '',
    model: '',
    year: '',
  });

  const resetAssetForm = () => {
    setAssetForm({
      name: '',
      identifier: '',
      type: '',
      manufacturer: '',
      model: '',
      year: '',
    });
    setEditingAsset(null);
  };

  const openCreateModal = () => {
    resetAssetForm();
    setShowAssetModal(true);
  };

  const openEditModal = (asset) => {
    setAssetForm({
      name: asset.name || '',
      identifier: asset.identifier || '',
      type: asset.type || '',
      manufacturer: asset.manufacturer || '',
      model: asset.model || '',
      year: asset.year?.toString() || '',
    });
    setEditingAsset(asset);
    setShowAssetModal(true);
  };

  const closeAssetModal = () => {
    setShowAssetModal(false);
    resetAssetForm();
  };

  const handleAssetSubmit = async (e) => {
    e.preventDefault();

    if (!assetForm.name.trim()) {
      showToast({ type: 'error', title: 'Numele este obligatoriu' });
      return;
    }

    try {
      if (editingAsset) {
        await updateAssetMutation.mutateAsync({
          id: editingAsset.id,
          data: assetForm,
        });
        showToast({ type: 'success', title: 'Echipament actualizat cu succes!' });
      } else {
        await createAssetMutation.mutateAsync(assetForm);
        showToast({ type: 'success', title: 'Echipament adaugat cu succes!' });
      }
      closeAssetModal();
    } catch (error) {
      showToast({
        type: 'error',
        title: error.response?.data?.message || 'Eroare la salvare',
      });
    }
  };

  const handleDeleteAsset = async () => {
    if (!deletingAsset) return;

    try {
      await deleteAssetMutation.mutateAsync(deletingAsset.id);
      showToast({ type: 'success', title: 'Echipament sters cu succes!' });
      setDeletingAsset(null);
    } catch (error) {
      showToast({
        type: 'error',
        title: error.response?.data?.message || 'Eroare la stergere',
      });
    }
  };

  // Build tabs based on sector config - only show assets tab for sectors with assets
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'profile', label: 'Profil', icon: User },
    ];

    // Show Assets tab only for sectors that use assets (not BEAUTY)
    if (hasAssets) {
      const assetIcon = assetType === 'vehicle' ? Car : Package;
      baseTabs.push({ id: 'assets', label: assetTerminology.plural, icon: assetIcon });
    }

    baseTabs.push({ id: 'security', label: 'Securitate', icon: Lock });
    return baseTabs;
  }, [hasAssets, assetType, assetTerminology.plural]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Profilul meu</h1>
        <p className="page-subtitle">Gestioneaza informatiile contului tau</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
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

      {/* Assets tab - only shown for sectors with assets */}
      {activeTab === 'assets' && hasAssets && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>{assetTerminology.plural}</CardTitle>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1" />
              Adauga
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!assets?.length ? (
              <div className="empty-state">
                <Package className="empty-state-icon" />
                <p className="empty-state-title">Nu exista {assetTerminology.plural.toLowerCase()}</p>
                <p className="empty-state-text">Adauga un echipament pentru a-l putea folosi la programari.</p>
                <Button className="mt-4" onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adauga {assetTerminology.singular.toLowerCase()}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {assets.map((asset) => (
                  <div key={asset.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {asset.name || `${asset.manufacturer || ''} ${asset.model || ''}`.trim() || assetTerminology.singular}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        {asset.identifier && (
                          <span>{assetTerminology.identifier}: {asset.identifier}</span>
                        )}
                        {asset.manufacturer && <span>Producator: {asset.manufacturer}</span>}
                        {asset.model && <span>Model: {asset.model}</span>}
                        {asset.year && <span>An: {asset.year}</span>}
                        {asset.type && <span>Tip: {asset.type}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(asset)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Editeaza"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingAsset(asset)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sterge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeAssetModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAsset ? 'Editeaza' : 'Adauga'} {assetTerminology.singular.toLowerCase()}
              </h2>
              <button
                onClick={closeAssetModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssetSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Denumire <span className="text-red-500">*</span>
                </label>
                <Input
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder={assetType === 'vehicle' ? 'Ex: Volkswagen Golf' : 'Ex: Laptop Dell XPS'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {assetTerminology.identifier}
                </label>
                <Input
                  value={assetForm.identifier}
                  onChange={(e) => setAssetForm({ ...assetForm, identifier: e.target.value })}
                  placeholder={assetType === 'vehicle' ? 'Ex: B 123 ABC' : 'Ex: SN123456'}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Producator
                  </label>
                  <Input
                    value={assetForm.manufacturer}
                    onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })}
                    placeholder={assetType === 'vehicle' ? 'Ex: Volkswagen' : 'Ex: Dell'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Model
                  </label>
                  <Input
                    value={assetForm.model}
                    onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                    placeholder={assetType === 'vehicle' ? 'Ex: Golf' : 'Ex: XPS 15'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    An fabricatie
                  </label>
                  <Input
                    type="number"
                    value={assetForm.year}
                    onChange={(e) => setAssetForm({ ...assetForm, year: e.target.value })}
                    placeholder="Ex: 2020"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tip
                  </label>
                  <Input
                    value={assetForm.type}
                    onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                    placeholder={assetType === 'vehicle' ? 'Ex: Autoturism' : 'Ex: Laptop'}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeAssetModal}>
                  Anuleaza
                </Button>
                <Button
                  type="submit"
                  isLoading={createAssetMutation.isPending || updateAssetMutation.isPending}
                >
                  {editingAsset ? 'Salveaza' : 'Adauga'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeletingAsset(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirmare stergere</h2>
            <p className="text-gray-600 mb-6">
              Esti sigur ca vrei sa stergi <strong>{deletingAsset.name}</strong>?
              Aceasta actiune nu poate fi anulata.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeletingAsset(null)}>
                Anuleaza
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAsset}
                isLoading={deleteAssetMutation.isPending}
              >
                Sterge
              </Button>
            </div>
          </div>
        </div>
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
                  {changePasswordMutation.error?.response?.data?.message || 'Eroare la schimbarea parolei'}
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

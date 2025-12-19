import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAssets, createAsset, updateAsset, deleteAsset } from '../services/assetService';
import useToast from '../context/useToast';
import { useTerminology } from '../context/TerminologyContext';
import DynamicAssetFields from '../components/DynamicAssetFields';
import { getAvailableAssetTypes } from '../constants/assetFieldTemplates';

const Assets = () => {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetForm, setAssetForm] = useState({
    name: '',
    identifier: '',
    type: 'vehicle',
    clientId: '',
    metadata: {},
  });

  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { assetSingular, assetPlural, assetIdentifier } = useTerminology();

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { search }],
    queryFn: () => fetchAssets({ search }),
  });

  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsCreating(false);
      setAssetForm({ name: '', identifier: '', type: 'vehicle', clientId: '', metadata: {} });
      showToast({ title: `${assetSingular} adaugat cu succes`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Eroare la adaugarea ${assetSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setEditingAsset(null);
      showToast({ title: `${assetSingular} actualizat cu succes`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Eroare la actualizarea ${assetSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      showToast({ title: `${assetSingular} sters cu succes`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Eroare la stergerea ${assetSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error'
      });
    },
  });

  const assets = data?.items || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, data: assetForm });
    } else {
      createMutation.mutate(assetForm);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{assetPlural}</h1>
          <p className="text-gray-600 mt-1">Gestioneaza {assetPlural.toLowerCase()} pentru clienti (vehicule, echipamente, aparate)</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-viperx-primary text-white rounded-lg hover:bg-orange-600 transition"
        >
          <Plus size={20} />
          Adauga {assetSingular}
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={`Cauta ${assetPlural.toLowerCase()} dupa nume, identificator, producator...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingAsset) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingAsset ? `Editeaza ${assetSingular}` : `Adauga ${assetSingular} nou`}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
              <input
                type="text"
                required
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary"
                placeholder="ex: 2019 Toyota Camry"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{assetIdentifier}</label>
              <input
                type="text"
                value={assetForm.identifier}
                onChange={(e) => setAssetForm({ ...assetForm, identifier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary"
                placeholder="VIN, Numar serie, Nr. inmatriculare"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip *</label>
              <select
                required
                value={assetForm.type}
                onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value, metadata: {} })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary"
              >
                {getAvailableAssetTypes().map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Asset Fields */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Detalii specifice</h3>
              <DynamicAssetFields
                assetType={assetForm.type}
                formData={assetForm}
                onChange={setAssetForm}
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-viperx-primary text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                {editingAsset ? `Actualizeaza ${assetSingular}` : `Adauga ${assetSingular}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingAsset(null);
                  setAssetForm({ name: '', identifier: '', type: 'vehicle', clientId: '', metadata: {} });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Anuleaza
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assets List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600">{search ? `Nu s-au gasit ${assetPlural.toLowerCase()}` : `Nu exista ${assetPlural.toLowerCase()} inca. Adauga primul ${assetSingular.toLowerCase()}!`}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nume</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{assetIdentifier}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{asset.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{asset.identifier || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {asset.type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{asset.manufacturer || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{asset.model || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {asset.client
                        ? asset.client.type === 'SRL'
                          ? asset.client.companyName
                          : `${asset.client.firstName} ${asset.client.lastName}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingAsset(asset);
                            setAssetForm({
                              name: asset.name,
                              identifier: asset.identifier || '',
                              type: asset.type || 'vehicle',
                              clientId: asset.clientId || '',
                              metadata: asset.metadata || {},
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Esti sigur ca vrei sa stergi acest ${assetSingular.toLowerCase()}?`)) {
                              deleteMutation.mutate(asset.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assets;

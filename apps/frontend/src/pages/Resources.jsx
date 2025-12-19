import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Boxes } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchResources, createResource, updateResource, deleteResource } from '../services/resourceService';
import useToast from '../context/useToast';
import { useTerminology } from '../context/TerminologyContext';

const Resources = () => {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    name: '',
    type: 'workspace',
    description: '',
    capacity: '1',
    isActive: true,
  });

  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { resourceSingular, resourcePlural } = useTerminology();

  const { data, isLoading } = useQuery({
    queryKey: ['resources', { search }],
    queryFn: () => fetchResources({ search }),
  });

  const createMutation = useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setIsCreating(false);
      setResourceForm({ name: '', type: 'workspace', description: '', capacity: '1', isActive: true });
      showToast({ title: `${resourceSingular} created successfully`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Error creating ${resourceSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateResource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setEditingResource(null);
      showToast({ title: `${resourceSingular} updated successfully`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Error updating ${resourceSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      showToast({ title: `${resourceSingular} deleted successfully`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Error deleting ${resourceSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error'
      });
    },
  });

  const resources = data?.items || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, data: resourceForm });
    } else {
      createMutation.mutate(resourceForm);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{resourcePlural}</h1>
          <p className="text-gray-600 mt-1">Manage scheduling {resourcePlural.toLowerCase()} (workspaces, service bays, equipment)</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-viperx-primary text-white rounded-lg hover:bg-orange-600 transition"
        >
          <Plus size={20} />
          Add {resourceSingular}
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={`Search ${resourcePlural.toLowerCase()} by name, type...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingResource) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingResource ? `Edit ${resourceSingular}` : `Create New ${resourceSingular}`}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={resourceForm.name}
                onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary"
                placeholder="Service Bay 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                required
                value={resourceForm.type}
                onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary"
              >
                <option value="workspace">Workspace</option>
                <option value="bay">Service Bay</option>
                <option value="equipment">Equipment</option>
                <option value="room">Room</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={resourceForm.description}
                onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary"
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
              <input
                type="number"
                required
                min="1"
                value={resourceForm.capacity}
                onChange={(e) => setResourceForm({ ...resourceForm, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary"
                placeholder="1"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={resourceForm.isActive}
                  onChange={(e) => setResourceForm({ ...resourceForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-viperx-primary border-gray-300 rounded focus:ring-viperx-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-viperx-primary text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                {editingResource ? `Update ${resourceSingular}` : `Create ${resourceSingular}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingResource(null);
                  setResourceForm({ name: '', type: 'workspace', description: '', capacity: '1', isActive: true });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resources List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <Boxes className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600">{search ? `No ${resourcePlural.toLowerCase()} found` : `No ${resourcePlural.toLowerCase()} yet. Create your first ${resourceSingular.toLowerCase()}!`}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{resource.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {resource.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{resource.description || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{resource.capacity}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        resource.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {resource.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingResource(resource);
                            setResourceForm({
                              name: resource.name,
                              type: resource.type,
                              description: resource.description || '',
                              capacity: String(resource.capacity),
                              isActive: resource.isActive,
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete this ${resourceSingular.toLowerCase()}?`)) {
                              deleteMutation.mutate(resource.id);
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

export default Resources;

import { useState } from 'react';

import useToast from '@/context/useToast';
import { useAssets, useCreateAsset, useDeleteAsset, useUpdateAsset } from '@/hooks/useProfile';
import { createAssetFormFromAsset, createEmptyAssetForm } from '@/utils/profileAssets';

export default function useProfileAssets() {
  const [assetForm, setAssetForm] = useState(createEmptyAssetForm);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deletingAsset, setDeletingAsset] = useState(null);

  const { data: assets } = useAssets();
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const { showToast } = useToast();

  const resetAssetForm = () => {
    setAssetForm(createEmptyAssetForm());
    setEditingAsset(null);
  };

  const openCreateModal = () => {
    resetAssetForm();
    setShowAssetModal(true);
  };

  const openEditModal = (asset) => {
    setAssetForm(createAssetFormFromAsset(asset));
    setEditingAsset(asset);
    setShowAssetModal(true);
  };

  const closeAssetModal = () => {
    setShowAssetModal(false);
    resetAssetForm();
  };

  const updateAssetField = (field, value) => {
    setAssetForm((current) => ({ ...current, [field]: value }));
  };

  const handleAssetSubmit = async (event) => {
    event.preventDefault();

    if (!assetForm.name.trim()) {
      showToast({ type: 'error', title: 'Numele este obligatoriu' });
      return;
    }

    try {
      if (editingAsset) {
        await updateAssetMutation.mutateAsync({ id: editingAsset.id, data: assetForm });
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

  return {
    assetForm,
    assets,
    deletingAsset,
    editingAsset,
    isDeletingAsset: deleteAssetMutation.isPending,
    isSavingAsset: createAssetMutation.isPending || updateAssetMutation.isPending,
    showAssetModal,
    cancelDeleteAsset: () => setDeletingAsset(null),
    closeAssetModal,
    confirmDeleteAsset: handleDeleteAsset,
    openCreateModal,
    openEditModal,
    requestDeleteAsset: setDeletingAsset,
    submitAsset: handleAssetSubmit,
    updateAssetField,
  };
}

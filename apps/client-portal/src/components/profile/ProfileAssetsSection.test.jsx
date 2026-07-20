import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProfileAssetsSection from './ProfileAssetsSection';

const assetTerminology = {
  singular: 'Vehicul',
  plural: 'Vehicule',
  identifier: 'Numar de inmatriculare',
};

const createProps = () => ({
  assetForm: null,
  assets: [],
  assetTerminology,
  assetType: 'vehicle',
  cancelDeleteAsset: vi.fn(),
  closeAssetModal: vi.fn(),
  confirmDeleteAsset: vi.fn(),
  deletingAsset: null,
  editingAsset: null,
  isDeletingAsset: false,
  isSavingAsset: false,
  openCreateModal: vi.fn(),
  openEditModal: vi.fn(),
  requestDeleteAsset: vi.fn(),
  showAssetModal: false,
  submitAsset: vi.fn(),
  updateAssetField: vi.fn(),
});

describe('ProfileAssetsSection', () => {
  it('keeps the sector terminology and empty-state create action', () => {
    const props = createProps();
    render(<ProfileAssetsSection {...props} />);

    expect(screen.getByText('Vehicule')).toBeVisible();
    expect(screen.getByText('Nu exista vehicule')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Adauga vehicul' }));
    expect(props.openCreateModal).toHaveBeenCalledOnce();
  });

  it('preserves asset display fallbacks and edit/delete actions', () => {
    const props = createProps();
    const asset = { id: 'asset-1', manufacturer: 'Volkswagen', model: 'Golf' };
    props.assets = [asset];
    render(<ProfileAssetsSection {...props} />);

    expect(screen.getByText('Volkswagen Golf')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Editeaza Volkswagen Golf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sterge Volkswagen Golf' }));

    expect(props.openEditModal).toHaveBeenCalledWith(asset);
    expect(props.requestDeleteAsset).toHaveBeenCalledWith(asset);
  });
});

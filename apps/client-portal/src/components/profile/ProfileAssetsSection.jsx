import { Package, Pencil, Plus, Trash2 } from 'lucide-react';

import AssetEditorDialog from '@/components/profile/AssetEditorDialog';
import DeleteAssetDialog from '@/components/profile/DeleteAssetDialog';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getAssetDisplayName } from '@/utils/profileAssets';

export default function ProfileAssetsSection({
  assetForm,
  assets,
  assetTerminology,
  assetType,
  cancelDeleteAsset,
  closeAssetModal,
  confirmDeleteAsset,
  deletingAsset,
  editingAsset,
  isDeletingAsset,
  isSavingAsset,
  openCreateModal,
  openEditModal,
  requestDeleteAsset,
  showAssetModal,
  submitAsset,
  updateAssetField,
}) {
  return (
    <>
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
              <p className="empty-state-text">
                Adauga un echipament pentru a-l putea folosi la programari.
              </p>
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
                      {getAssetDisplayName(asset, assetTerminology.singular)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      {asset.identifier && (
                        <span>
                          {assetTerminology.identifier}: {asset.identifier}
                        </span>
                      )}
                      {asset.manufacturer && <span>Producator: {asset.manufacturer}</span>}
                      {asset.model && <span>Model: {asset.model}</span>}
                      {asset.year && <span>An: {asset.year}</span>}
                      {asset.type && <span>Tip: {asset.type}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(asset)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Editeaza"
                      aria-label={`Editeaza ${getAssetDisplayName(asset, assetTerminology.singular)}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteAsset(asset)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sterge"
                      aria-label={`Sterge ${getAssetDisplayName(asset, assetTerminology.singular)}`}
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

      {showAssetModal && (
        <AssetEditorDialog
          assetForm={assetForm}
          assetTerminology={assetTerminology}
          assetType={assetType}
          editingAsset={editingAsset}
          isSavingAsset={isSavingAsset}
          onClose={closeAssetModal}
          onSubmit={submitAsset}
          onUpdateField={updateAssetField}
        />
      )}

      {deletingAsset && (
        <DeleteAssetDialog
          asset={deletingAsset}
          isDeletingAsset={isDeletingAsset}
          onCancel={cancelDeleteAsset}
          onConfirm={confirmDeleteAsset}
        />
      )}
    </>
  );
}

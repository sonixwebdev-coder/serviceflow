import { X } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function AssetEditorDialog({
  assetForm,
  assetTerminology,
  assetType,
  editingAsset,
  isSavingAsset,
  onClose,
  onSubmit,
  onUpdateField,
}) {
  if (!assetForm) return null;

  const title = `${editingAsset ? 'Editeaza' : 'Adauga'} ${assetTerminology.singular.toLowerCase()}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-editor-title"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Inchide formularul"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="asset-editor-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Inchide formularul"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Denumire <span className="text-red-500">*</span>
            </label>
            <Input
              value={assetForm.name}
              onChange={(event) => onUpdateField('name', event.target.value)}
              placeholder={assetType === 'vehicle' ? 'Ex: Volkswagen Golf' : 'Ex: Laptop Dell XPS'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {assetTerminology.identifier}
            </label>
            <Input
              value={assetForm.identifier}
              onChange={(event) => onUpdateField('identifier', event.target.value)}
              placeholder={assetType === 'vehicle' ? 'Ex: B 123 ABC' : 'Ex: SN123456'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Producator</label>
              <Input
                value={assetForm.manufacturer}
                onChange={(event) => onUpdateField('manufacturer', event.target.value)}
                placeholder={assetType === 'vehicle' ? 'Ex: Volkswagen' : 'Ex: Dell'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
              <Input
                value={assetForm.model}
                onChange={(event) => onUpdateField('model', event.target.value)}
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
                onChange={(event) => onUpdateField('year', event.target.value)}
                placeholder="Ex: 2020"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tip</label>
              <Input
                value={assetForm.type}
                onChange={(event) => onUpdateField('type', event.target.value)}
                placeholder={assetType === 'vehicle' ? 'Ex: Autoturism' : 'Ex: Laptop'}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Anuleaza
            </Button>
            <Button type="submit" isLoading={isSavingAsset}>
              {editingAsset ? 'Salveaza' : 'Adauga'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

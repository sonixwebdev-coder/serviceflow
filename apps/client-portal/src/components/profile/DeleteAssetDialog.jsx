import Button from '@/components/ui/Button';

export default function DeleteAssetDialog({ asset, isDeletingAsset, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-asset-title"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        onClick={onCancel}
        aria-label="Inchide confirmarea"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 id="delete-asset-title" className="text-lg font-semibold text-gray-900 mb-2">
          Confirmare stergere
        </h2>
        <p className="text-gray-600 mb-6">
          Esti sigur ca vrei sa stergi <strong>{asset.name}</strong>? Aceasta actiune nu poate fi
          anulata.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Anuleaza
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isDeletingAsset}>
            Sterge
          </Button>
        </div>
      </div>
    </div>
  );
}

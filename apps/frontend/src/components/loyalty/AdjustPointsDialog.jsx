import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useAdjustPoints } from '../../hooks/useLoyalty';
import useToast from '../../context/useToast';

export default function AdjustPointsDialog({ clientId, onClose }) {
  const [points, setPoints] = useState(0);
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('add'); // 'add' or 'subtract'
  const adjustPoints = useAdjustPoints();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = mode === 'subtract' ? -Math.abs(points) : Math.abs(points);
    if (value === 0) return;

    try {
      await adjustPoints.mutateAsync({
        clientId,
        data: { points: value, description },
      });
      showToast({ title: 'Puncte ajustate cu succes', type: 'success' });
      onClose();
    } catch (error) {
      showToast({ title: 'Eroare', description: error.response?.data?.error || error.message, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ajustare puncte</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === 'add'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Plus size={16} />
              Adauga
            </button>
            <button
              type="button"
              onClick={() => setMode('subtract')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === 'subtract'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Minus size={16} />
              Scade
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puncte</label>
            <input
              type="number"
              min="1"
              required
              value={points || ''}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Numar de puncte"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Motivul ajustarii"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Anuleaza
            </button>
            <button
              type="submit"
              disabled={adjustPoints.isPending || !points || !description}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                mode === 'subtract'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {adjustPoints.isPending ? 'Se proceseaza...' : 'Confirma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

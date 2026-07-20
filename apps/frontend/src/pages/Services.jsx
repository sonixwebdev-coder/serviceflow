import { useState, useMemo } from 'react';
import confirm from '../utils/confirm';
import { Briefcase, Plus, Edit2, Trash2, Search, X, Clock, Banknote, Image } from 'lucide-react';
import { useServices, useServicesMutation } from '../hooks/useServices';
import useToast from '../context/useToast';

const ServiceCard = ({ service, onEdit, onDelete, isDeleting }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md overflow-hidden">
      {service.image && (
        <div className="h-40 w-full overflow-hidden bg-gray-100">
          <img
            src={service.image}
            alt={service.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{service.name}</h3>
              {service.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{service.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(service)}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              title="Editeaza"
            >
              <Edit2 size={18} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(service.id)}
              disabled={isDeleting}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sterge"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          {service.price && (
            <div className="flex items-center gap-1.5">
              <Banknote size={14} />
              <span>{service.price}</span>
            </div>
          )}
          {service.duration && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{service.duration}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ServiceModal = ({ service, onClose, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || '',
    duration: service?.duration || '',
    image: service?.image || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      style={{ margin: 0 }}
    >
      <div className="relative w-full max-w-lg rounded-lg bg-white p-4 sm:p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          {service ? 'Editeaza serviciul' : 'Adauga serviciu nou'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nume serviciu *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="ex: Consultanta IT"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descriere</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Descriere scurta a serviciului"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Pret</label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ex: 150 RON"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Durata</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ex: 60 min"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              <div className="flex items-center gap-1.5">
                <Image size={14} />
                URL Imagine
              </div>
            </label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="https://exemplu.com/imagine.jpg"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Anuleaza
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Se salveaza...' : service ? 'Salveaza' : 'Adauga'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Services = () => {
  const { showToast } = useToast();
  const { services, loading, error } = useServices();
  const { updateServices, isSaving } = useServicesMutation();

  const [modalService, setModalService] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const filteredServices = useMemo(() => {
    if (!search) return services;
    const searchLower = search.toLowerCase();
    return services.filter(
      (s) =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower)
    );
  }, [services, search]);

  const handleSave = async (data) => {
    try {
      let updatedServices;
      if (modalService) {
        updatedServices = services.map((s) => (s.id === modalService.id ? { ...s, ...data } : s));
      } else {
        updatedServices = [...services, { ...data, id: crypto.randomUUID() }];
      }

      await updateServices(updatedServices);
      showToast({
        title: modalService ? 'Serviciu actualizat' : 'Serviciu adaugat',
        description: modalService
          ? 'Serviciul a fost actualizat cu succes.'
          : 'Serviciul a fost adaugat cu succes.',
        type: 'success',
      });
      setShowModal(false);
      setModalService(null);
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.message || 'A aparut o eroare.',
        type: 'error',
      });
    }
  };

  const handleDelete = async (serviceId) => {
    if (
      !(await confirm({
        title: 'Sterge serviciu',
        text: 'Esti sigur ca vrei sa stergi acest serviciu?',
        confirmText: 'Sterge',
        danger: true,
      }))
    ) {
      return;
    }

    try {
      const updatedServices = services.filter((s) => s.id !== serviceId);
      await updateServices(updatedServices);
      showToast({
        title: 'Serviciu sters',
        description: 'Serviciul a fost sters cu succes.',
        type: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.message || 'A aparut o eroare.',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicii</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestioneaza serviciile oferite de compania ta
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalService(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
        >
          <Plus size={18} />
          Adauga serviciu
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cauta servicii..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {filteredServices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Niciun serviciu</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search
              ? 'Niciun serviciu nu corespunde cautarii.'
              : 'Incepe prin a adauga primul serviciu.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => {
                setModalService(null);
                setShowModal(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
            >
              <Plus size={18} />
              Adauga serviciu
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={(s) => {
                setModalService(s);
                setShowModal(true);
              }}
              onDelete={handleDelete}
              isDeleting={isSaving}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ServiceModal
          service={modalService}
          onClose={() => {
            setShowModal(false);
            setModalService(null);
          }}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default Services;

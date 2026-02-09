import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  MoreVertical,
  UserPlus,
  Trash2,
  Filter,
  RefreshCw,
  Loader2,
  Globe,
  ArrowLeft,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWebsite, useWebsiteLeads, useLeadMutations } from '@/hooks/useWebsiteBuilder';
import Pagination from '@/components/Pagination';
import useToast from '@/context/useToast';

const statusColors = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  QUALIFIED: 'bg-purple-100 text-purple-800',
  CONVERTED: 'bg-green-100 text-green-800',
  LOST: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  NEW: 'Nou',
  CONTACTED: 'Contactat',
  QUALIFIED: 'Calificat',
  CONVERTED: 'Convertit',
  LOST: 'Pierdut',
};

const WebsiteLeads = () => {
  const { showToast } = useToast();
  const { website, loading: websiteLoading, hasWebsite } = useWebsite();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const {
    leads,
    pagination,
    loading: leadsLoading,
    refresh: refreshLeads,
  } = useWebsiteLeads(website?.id, {
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 20,
  }, { enabled: !!website?.id });

  const {
    updateLead,
    deleteLead,
    convertToClient,
    isUpdating,
    isDeleting,
    isConverting,
  } = useLeadMutations(website?.id);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await updateLead({ leadId, data: { status: newStatus } });
      refreshLeads();
      showToast({ title: 'Status actualizat!', type: 'success' });
    } catch (error) {
      showToast({ title: 'Eroare la actualizare status', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    try {
      await deleteLead(selectedLead.id);
      setShowDeleteDialog(false);
      setSelectedLead(null);
      refreshLeads();
      showToast({ title: 'Lead sters!', type: 'success' });
    } catch (error) {
      showToast({ title: 'Eroare la stergere', type: 'error' });
    }
  };

  const handleConvert = async (lead) => {
    try {
      await convertToClient(lead.id);
      refreshLeads();
      showToast({ title: 'Lead convertit in client!', type: 'success' });
    } catch (error) {
      showToast({ title: 'Eroare la conversie', type: 'error' });
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Stats
  const stats = useMemo(() => {
    if (!leads.length) return { new: 0, contacted: 0, qualified: 0, converted: 0 };
    return {
      new: leads.filter(l => l.status === 'NEW').length,
      contacted: leads.filter(l => l.status === 'CONTACTED').length,
      qualified: leads.filter(l => l.status === 'QUALIFIED').length,
      converted: leads.filter(l => l.status === 'CONVERTED').length,
    };
  }, [leads]);

  if (websiteLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!hasWebsite) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-center py-12 px-6">
            <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Nu exista website</h2>
            <p className="text-gray-500 mb-4">
              Creeaza un website pentru a incepe sa primesti lead-uri.
            </p>
            <Link
              to="/settings/website"
              className="inline-flex items-center px-4 py-2 bg-viperx-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Creeaza website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/settings/website"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead-uri Website</h1>
            <p className="text-gray-500">
              Persoane care au completat formularul de contact pe website
            </p>
          </div>
        </div>
        <button
          onClick={() => refreshLeads()}
          className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizeaza
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Lead-uri noi</p>
              <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Contactati</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Calificati</p>
              <p className="text-2xl font-bold text-purple-600">{stats.qualified}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Convertiti</p>
              <p className="text-2xl font-bold text-green-600">{stats.converted}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cauta dupa nume, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent"
            >
              <option value="all">Toate statusurile</option>
              <option value="NEW">Noi</option>
              <option value="CONTACTED">Contactati</option>
              <option value="QUALIFIED">Calificati</option>
              <option value="CONVERTED">Convertiti</option>
              <option value="LOST">Pierduti</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nume</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sursa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leadsLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p>Niciun lead gasit</p>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {lead.firstName} {lead.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                          {lead.email}
                        </a>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                            {lead.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                      {lead.source || 'contact-form'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className={`px-2 py-1 rounded-md text-xs font-medium border-0 cursor-pointer ${statusColors[lead.status]}`}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(lead.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === lead.id ? null : lead.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openDropdownId === lead.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdownId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowDetailsDialog(true);
                                setOpenDropdownId(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Vezi detalii
                            </button>
                            {lead.status !== 'CONVERTED' && !lead.clientId && (
                              <button
                                onClick={() => {
                                  handleConvert(lead);
                                  setOpenDropdownId(null);
                                }}
                                disabled={isConverting}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Converteste in client
                              </button>
                            )}
                            <hr className="my-1 border-gray-200" />
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowDeleteDialog(true);
                                setOpenDropdownId(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sterge
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="border-t border-gray-200">
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              onPageChange={setPage}
              totalItems={pagination.total}
              pageSize={pagination.limit}
            />
          </div>
        )}
      </div>

      {/* Details Dialog */}
      {showDetailsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDetailsDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Detalii lead</h3>
              <button
                onClick={() => setShowDetailsDialog(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedLead && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Nume</label>
                    <p className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Status</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${statusColors[selectedLead.status]}`}>
                      {statusLabels[selectedLead.status]}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p>{selectedLead.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Telefon</label>
                    <p>{selectedLead.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Sursa</label>
                    <p>{selectedLead.source || 'contact-form'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Data</label>
                    <p>{formatDate(selectedLead.createdAt)}</p>
                  </div>
                </div>
                {selectedLead.message && (
                  <div>
                    <label className="text-sm text-gray-500">Mesaj</label>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                      {selectedLead.message}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDetailsDialog(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Inchide
              </button>
              {selectedLead && selectedLead.status !== 'CONVERTED' && !selectedLead.clientId && (
                <button
                  onClick={() => {
                    handleConvert(selectedLead);
                    setShowDetailsDialog(false);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-viperx-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Converteste in client
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Sterge lead</h3>
            <p className="text-gray-500 mb-6">
              Esti sigur ca vrei sa stergi acest lead? Aceasta actiune nu poate fi anulata.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anuleaza
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sterge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteLeads;

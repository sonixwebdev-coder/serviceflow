import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, User, Building, ExternalLink, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAssets } from '../services/assetService';
import { useTerminology } from '../context/TerminologyContext';
import useLocationStore from '../state/useLocationStore';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 20;

const Assets = () => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const { assetPlural, assetIdentifier, assetSingular } = useTerminology();
  const currentLocationId = useLocationStore((s) => s.currentLocationId);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['assets', { search, page: currentPage, limit: PAGE_SIZE, locationId: currentLocationId }],
    queryFn: () => fetchAssets({ search, page: currentPage, limit: PAGE_SIZE }),
  });

  // Reset to page 1 when search changes
  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const assets = data?.items || [];
  const pagination = {
    page: data?.page || 1,
    total: data?.total || 0,
    pages: data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1,
  };

  const getClientDisplayName = (client) => {
    if (!client) return null;
    return client.type === 'SRL' ? client.companyName : `${client.firstName} ${client.lastName}`;
  };

  const handleClientClick = (client) => {
    if (!client) return;
    // Navigate to clients page with search pre-filled
    const searchTerm = client.type === 'SRL' ? client.companyName : `${client.firstName} ${client.lastName}`;
    navigate(`/clients?search=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{assetPlural}</h1>
        <p className="page-subtitle">
          Cauta si vizualizeaza {assetPlural.toLowerCase()} clientilor
        </p>
      </div>

      {/* Search Filter */}
      <div className="filter-bar">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Cauta ${assetPlural.toLowerCase()} dupa nume, identificator, producator...`}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            <X size={14} />
            Sterge cautarea
          </button>
        )}
      </div>

      {/* Assets List */}
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : assets.length === 0 ? (
          <div className="empty-state">
            <Package className="empty-state-icon" />
            <p className="empty-state-title">
              {search
                ? `Nu s-au gasit ${assetPlural.toLowerCase()}`
                : `Nu exista ${assetPlural.toLowerCase()} inregistrate`}
            </p>
            <p className="empty-state-text">
              {search
                ? 'Incearca o alta cautare.'
                : `${assetPlural} sunt adaugate automat cand creezi programari pentru clienti.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nume</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{assetIdentifier}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Producator</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assets.map((asset) => {
                  const clientName = getClientDisplayName(asset.client);
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{asset.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{asset.identifier || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {assetSingular}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{asset.manufacturer || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{asset.model || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        {clientName ? (
                          <button
                            onClick={() => handleClientClick(asset.client)}
                            className="inline-flex items-center gap-2 text-primary hover:text-orange-700 transition group"
                          >
                            <span className="flex items-center gap-1.5">
                              {asset.client.type === 'SRL' ? (
                                <Building size={14} className="text-blue-600" />
                              ) : (
                                <User size={14} className="text-primary" />
                              )}
                              <span className="font-medium">{clientName}</span>
                            </span>
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition" />
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Assets;

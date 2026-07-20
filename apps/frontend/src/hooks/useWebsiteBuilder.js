import { useState, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWebsite,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  checkSubdomainAvailability,
  publishWebsite,
  fetchCrmData,
  fetchPages,
  fetchPageById,
  createPage,
  updatePage,
  deletePage,
  reorderPages,
  fetchLeads,
  updateLead,
  deleteLead,
  convertLeadToClient,
  approveReview,
  rejectReview,
} from '../services/websiteService';

/**
 * Hook to manage the organization's website
 */
export const useWebsite = (options = {}) => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['website'],
    queryFn: fetchWebsite,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    website: query.data || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
    hasWebsite: !!query.data,
  };
};

/**
 * Hook for website mutations
 */
export const useWebsiteMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createWebsite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ websiteId, data }) => updateWebsite(websiteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebsite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ websiteId, isPublished }) => publishWebsite(websiteId, isPublished),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website'] });
    },
  });

  return {
    createWebsite: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError:
      createMutation.error?.response?.data?.message || createMutation.error?.message || null,

    updateWebsite: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError:
      updateMutation.error?.response?.data?.message || updateMutation.error?.message || null,

    deleteWebsite: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError:
      deleteMutation.error?.response?.data?.message || deleteMutation.error?.message || null,

    publishWebsite: publishMutation.mutateAsync,
    isPublishing: publishMutation.isPending,
    publishError:
      publishMutation.error?.response?.data?.message || publishMutation.error?.message || null,
  };
};

/**
 * Hook to check subdomain availability
 */
export const useSubdomainCheck = () => {
  const [subdomain, setSubdomain] = useState('');
  const [debouncedSubdomain, setDebouncedSubdomain] = useState('');

  const query = useQuery({
    queryKey: ['subdomain-check', debouncedSubdomain],
    queryFn: () => checkSubdomainAvailability(debouncedSubdomain),
    enabled: debouncedSubdomain.length >= 3,
    staleTime: 30 * 1000, // 30 seconds
  });

  const timerRef = useRef(null);
  const checkSubdomain = useCallback((value) => {
    setSubdomain(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSubdomain(value);
    }, 500);
  }, []);

  return {
    subdomain,
    checkSubdomain,
    isAvailable: query.data?.available,
    isChecking: query.isLoading,
  };
};

/**
 * Hook to manage website pages
 */
export const useWebsitePages = (websiteId, options = {}) => {
  const { enabled = true } = options;
  const [filters, setFilters] = useState({});

  const query = useQuery({
    queryKey: ['website-pages', websiteId, filters],
    queryFn: () => fetchPages(websiteId, filters),
    enabled: enabled && !!websiteId,
  });

  return {
    pages: query.data?.items || [],
    pagination: query.data?.pagination || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    filters,
    setFilters,
    refresh: query.refetch,
  };
};

/**
 * Hook to manage a single page
 */
export const useWebsitePage = (websiteId, pageId, options = {}) => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['website-page', websiteId, pageId],
    queryFn: () => fetchPageById(websiteId, pageId),
    enabled: enabled && !!websiteId && !!pageId,
  });

  return {
    page: query.data || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
};

/**
 * Hook for page mutations
 */
export const usePageMutations = (websiteId) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => createPage(websiteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-pages', websiteId] });
      queryClient.invalidateQueries({ queryKey: ['website'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ pageId, data }) => updatePage(websiteId, pageId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['website-pages', websiteId] });
      queryClient.invalidateQueries({ queryKey: ['website-page', websiteId, variables.pageId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pageId) => deletePage(websiteId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-pages', websiteId] });
      queryClient.invalidateQueries({ queryKey: ['website'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (pageIds) => reorderPages(websiteId, pageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-pages', websiteId] });
    },
  });

  return {
    createPage: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError:
      createMutation.error?.response?.data?.message || createMutation.error?.message || null,

    updatePage: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError:
      updateMutation.error?.response?.data?.message || updateMutation.error?.message || null,

    deletePage: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError:
      deleteMutation.error?.response?.data?.message || deleteMutation.error?.message || null,

    reorderPages: reorderMutation.mutateAsync,
    isReordering: reorderMutation.isPending,
    reorderError:
      reorderMutation.error?.response?.data?.message || reorderMutation.error?.message || null,
  };
};

/**
 * Hook to manage website leads
 */
export const useWebsiteLeads = (websiteId, filters = {}, options = {}) => {
  const { enabled = true } = options;
  const queryKey = useMemo(() => ['website-leads', websiteId, filters], [websiteId, filters]);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchLeads(websiteId, filters),
    enabled: enabled && !!websiteId,
  });

  return {
    leads: query.data?.items || [],
    pagination: query.data?.pagination || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
};

/**
 * Hook for lead mutations
 */
export const useLeadMutations = (websiteId) => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ leadId, data }) => updateLead(websiteId, leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-leads', websiteId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (leadId) => deleteLead(websiteId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-leads', websiteId] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (leadId) => convertLeadToClient(websiteId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-leads', websiteId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (leadId) => approveReview(websiteId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-leads', websiteId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (leadId) => rejectReview(websiteId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-leads', websiteId] });
    },
  });

  return {
    updateLead: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError:
      updateMutation.error?.response?.data?.message || updateMutation.error?.message || null,

    deleteLead: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError:
      deleteMutation.error?.response?.data?.message || deleteMutation.error?.message || null,

    convertToClient: convertMutation.mutateAsync,
    isConverting: convertMutation.isPending,
    convertError:
      convertMutation.error?.response?.data?.message || convertMutation.error?.message || null,

    approveReview: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,

    rejectReview: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
  };
};

/**
 * Hook to fetch CRM data for auto-sync blocks
 */
export const useCrmData = (dataType, options = {}) => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['crm-data', dataType],
    queryFn: () => fetchCrmData(dataType),
    enabled: enabled && !!dataType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refresh: query.refetch,
  };
};

/**
 * Hook for block editor state management
 */
export const useBlockEditor = (initialBlocks = []) => {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  const addBlock = useCallback((block, index = -1) => {
    setBlocks((prev) => {
      const newBlocks = [...prev];
      if (index >= 0) {
        newBlocks.splice(index, 0, block);
      } else {
        newBlocks.push(block);
      }
      return newBlocks;
    });
    setSelectedBlockId(block.id);
    setIsDirty(true);
  }, []);

  const updateBlock = useCallback((blockId, updates) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)));
    setIsDirty(true);
  }, []);

  const updateBlockData = useCallback((blockId, dataUpdates) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, data: { ...b.data, ...dataUpdates } } : b))
    );
    setIsDirty(true);
  }, []);

  const updateBlockSettings = useCallback((blockId, settingsUpdates) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, settings: { ...b.settings, ...settingsUpdates } } : b
      )
    );
    setIsDirty(true);
  }, []);

  const removeBlock = useCallback(
    (blockId) => {
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
      }
      setIsDirty(true);
    },
    [selectedBlockId]
  );

  const moveBlock = useCallback((fromIndex, toIndex) => {
    setBlocks((prev) => {
      const newBlocks = [...prev];
      const [movedBlock] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, movedBlock);
      return newBlocks;
    });
    setIsDirty(true);
  }, []);

  const duplicateBlock = useCallback((blockId) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === blockId);
      if (index === -1) return prev;

      const block = prev[index];
      const newBlock = {
        ...block,
        id: `${block.type}-${Date.now()}`,
        data: { ...block.data },
        settings: { ...block.settings },
      };

      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
    setIsDirty(true);
  }, []);

  const resetBlocks = useCallback((newBlocks) => {
    setBlocks(newBlocks);
    setSelectedBlockId(null);
    setIsDirty(false);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  return {
    blocks,
    selectedBlockId,
    selectedBlock,
    isDirty,
    setSelectedBlockId,
    addBlock,
    updateBlock,
    updateBlockData,
    updateBlockSettings,
    removeBlock,
    moveBlock,
    duplicateBlock,
    resetBlocks,
    markClean,
  };
};

/**
 * Generate a unique block ID
 */
export const generateBlockId = (type) => {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a new block with defaults
 */
export const createBlock = (type, data = {}, settings = {}) => {
  return {
    id: generateBlockId(type),
    type,
    data,
    settings: {
      padding: { top: 40, bottom: 40 },
      maxWidth: 'lg',
      alignment: 'center',
      ...settings,
    },
  };
};

export default useWebsite;

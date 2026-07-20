import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Globe,
  FileText,
  Palette,
  Search,
  Layers,
  Plus,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
  Loader2,
  Trash2,
  MoreVertical,
  Layout,
  X,
  Users,
  Pencil,
} from 'lucide-react';
import {
  useWebsite,
  useWebsiteMutations,
  useSubdomainCheck,
  useWebsitePages,
  usePageMutations,
  useBlockEditor,
  useCrmData,
} from '@/hooks/useWebsiteBuilder';
import BlockEditor from '@/components/website-builder/BlockEditor';
import FloatingHelperWidget from '@/components/website-builder/FloatingHelperWidget';
import {
  BrandingSettings,
  SeoSettings,
  PageSeoSettings,
  HeaderFooterSettings,
} from '@/components/website-builder/settings';
import {
  TemplateSelector,
  templates as allTemplates,
  getTemplatesBySector,
} from '@/components/website-builder/templates';
import { bulkUpsertPages } from '@/services/websiteService';
import useToast from '@/context/useToast';
import useAuth from '@/context/useAuth';
import { runtimeConfig } from '@/config/runtime';

const WebsiteBuilder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Website data
  const { website, loading: websiteLoading, hasWebsite, refresh: refreshWebsite } = useWebsite();
  const {
    createWebsite,
    updateWebsite,
    publishWebsite,
    isCreating,
    isUpdating,
    isPublishing,
    createError,
    updateError,
  } = useWebsiteMutations();

  // Subdomain checking
  const { checkSubdomain, isAvailable, isChecking } = useSubdomainCheck();

  // Pages
  const {
    pages,
    loading: pagesLoading,
    refresh: refreshPages,
  } = useWebsitePages(website?.id, { enabled: !!website?.id });
  const {
    createPage,
    updatePage,
    deletePage,
    isUpdating: isUpdatingPage,
  } = usePageMutations(website?.id);

  // CRM data for auto-sync blocks
  const { data: servicesData } = useCrmData('services', { enabled: !!website?.id });
  const { data: teamData } = useCrmData('team', { enabled: !!website?.id });
  const { data: locationsData } = useCrmData('locations', { enabled: !!website?.id });
  const crmData = { services: servicesData, team: teamData, locations: locationsData };

  // Local state
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pages');
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);
  const [showDeletePageDialog, setShowDeletePageDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [setupSubdomain, setSetupSubdomain] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [openPageMenuId, setOpenPageMenuId] = useState(null);
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [pageTitleDraft, setPageTitleDraft] = useState('');
  const [showPageSeo, setShowPageSeo] = useState(false);

  // Block editor state
  const {
    blocks,
    selectedBlockId,
    isDirty,
    setSelectedBlockId,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    duplicateBlock,
    resetBlocks,
    markClean,
  } = useBlockEditor([]);

  // Get current page
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  // Load page content into editor
  useEffect(() => {
    if (selectedPage?.content) {
      resetBlocks(selectedPage.content);
    }
  }, [selectedPageId, selectedPage?.content, resetBlocks]);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Show setup dialog if no website exists
  useEffect(() => {
    if (!websiteLoading && !hasWebsite) {
      setShowSetupDialog(true);
    }
  }, [websiteLoading, hasWebsite]);

  // Select first page by default
  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  // Handle subdomain input
  const handleSetupSubdomainChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSetupSubdomain(value);
    checkSubdomain(value);
  };

  // Create website
  const [isCreatingPages, setIsCreatingPages] = useState(false);

  const handleCreateWebsite = async (template = null) => {
    try {
      const data = {
        subdomain: setupSubdomain,
        templateId: template?.id,
        branding: template?.branding,
        seoDefaults: template?.seoDefaults,
      };

      const newWebsite = await createWebsite(data);
      showToast({ title: 'Website creat cu succes!', type: 'success' });
      refreshWebsite();

      // If template selected, bulk create pages using the new website's ID
      if (template?.pages?.length && newWebsite?.id) {
        setIsCreatingPages(true);
        await bulkUpsertPages(
          newWebsite.id,
          template.pages.map((p) => ({ ...p, isPublished: true }))
        );
        setIsCreatingPages(false);
        refreshPages();
      }

      setShowSetupDialog(false);
    } catch (error) {
      setIsCreatingPages(false);
      showToast({
        title: error.message || createError || 'Eroare la crearea website-ului',
        type: 'error',
      });
    }
  };

  // Save page content
  const handleSavePage = async () => {
    if (!selectedPage || !isDirty) return;

    try {
      await updatePage({
        pageId: selectedPage.id,
        data: { content: blocks },
      });
      markClean();
      showToast({ title: 'Pagina salvata cu succes!', type: 'success' });
    } catch (error) {
      showToast({ title: 'Eroare la salvarea paginii', type: 'error' });
    }
  };

  // Save page title inline
  const handleSavePageTitle = async () => {
    if (!selectedPage || !pageTitleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    if (pageTitleDraft.trim() === selectedPage.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await updatePage({
        pageId: selectedPage.id,
        data: { title: pageTitleDraft.trim() },
      });
      refreshPages();
      setEditingTitle(false);
      showToast({ title: 'Titlul paginii a fost actualizat!', type: 'success' });
    } catch (error) {
      showToast({ title: 'Eroare la actualizarea titlului', type: 'error' });
    }
  };

  // Save page SEO
  const handleSavePageSeo = async (seoData) => {
    if (!selectedPage) return;
    try {
      await updatePage({
        pageId: selectedPage.id,
        data: { seo: seoData },
      });
      refreshPages();
      setShowPageSeo(false);
      showToast({ title: 'Setarile SEO ale paginii au fost salvate!', type: 'success' });
    } catch (error) {
      showToast({ title: 'Eroare la salvarea setarilor SEO', type: 'error' });
    }
  };

  // Create new page
  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return;

    try {
      const slug = newPageTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const newPage = await createPage({
        title: newPageTitle,
        slug,
        content: [],
        isPublished: true,
      });
      setNewPageTitle('');
      setShowNewPageDialog(false);
      refreshPages();
      setSelectedPageId(newPage.id);
      showToast({ title: 'Pagina creata cu succes!', type: 'success' });
    } catch (error) {
      showToast({ title: error.message || 'Eroare la crearea paginii', type: 'error' });
    }
  };

  // Toggle page publish
  const handleTogglePagePublish = async (page) => {
    try {
      await updatePage({
        pageId: page.id,
        data: { isPublished: !page.isPublished },
      });
      refreshPages();
      showToast({
        title: page.isPublished ? 'Pagina retrasa din publicare' : 'Pagina publicata!',
        type: 'success',
      });
    } catch (error) {
      showToast({ title: 'Eroare la actualizarea paginii', type: 'error' });
    }
  };

  // Delete page
  const handleDeletePage = async () => {
    if (!selectedPage) return;

    try {
      await deletePage(selectedPage.id);
      setShowDeletePageDialog(false);
      setSelectedPageId(pages[0]?.id);
      refreshPages();
      showToast({ title: 'Pagina stearsa cu succes!', type: 'success' });
    } catch (error) {
      showToast({ title: 'Eroare la stergerea paginii', type: 'error' });
    }
  };

  // Publish/unpublish website
  const handlePublish = async () => {
    const isPublishing = !website.isPublished;
    try {
      await publishWebsite({
        websiteId: website.id,
        isPublished: isPublishing,
      });
      refreshWebsite();
      showToast({
        title: isPublishing ? 'Website publicat cu succes!' : 'Website retras din publicare',
        type: 'success',
      });
    } catch (error) {
      showToast({ title: 'Eroare la publicare', type: 'error' });
    }
  };

  // Update website settings
  const handleUpdateWebsite = async (data) => {
    try {
      await updateWebsite({ websiteId: website.id, data });
      refreshWebsite();
      showToast({ title: 'Setari actualizate!', type: 'success' });
    } catch (error) {
      showToast({ title: updateError || 'Eroare la actualizare', type: 'error' });
    }
  };

  // Apply template to existing website
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const handleApplyTemplate = async (template) => {
    setIsApplyingTemplate(true);
    try {
      // Bulk upsert pages FIRST - validates plan limits upfront before any changes
      if (template.pages?.length) {
        await bulkUpsertPages(
          website.id,
          template.pages.map((p) => ({ ...p, isPublished: true }))
        );
      }

      // Only update branding/SEO after pages succeed
      await updateWebsite({
        websiteId: website.id,
        data: {
          templateId: template.id,
          branding: template.branding,
          seoDefaults: template.seoDefaults,
        },
      });

      refreshWebsite();
      refreshPages();
      setShowTemplateConfirm(null);
      setActiveTab('pages');
      showToast({ title: 'Template aplicat cu succes!', type: 'success' });
    } catch (error) {
      showToast({ title: error.message || 'Eroare la aplicarea template-ului', type: 'error' });
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Detect mobile viewport
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loading state
  if (websiteLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Mobile not supported for website builder
  if (isMobileView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center px-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Website Builder</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            Website Builder-ul necesita un ecran mai mare pentru a functiona corect. Te rugam sa il
            accesezi de pe un calculator sau tableta.
          </p>
        </div>
      </div>
    );
  }

  const websiteUrl = website?.url || null;

  const tabs = [
    { id: 'pages', label: 'Pagini', icon: FileText },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'layout', label: 'Header & Footer', icon: Layout },
    { id: 'templates', label: 'Template-uri', icon: Layers },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Globe className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Website Builder</h1>
                {website?.subdomain && (
                  <p className="text-sm text-gray-500">{websiteUrl?.replace(/^https?:\/\//, '')}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {website && (
                <>
                  <Link
                    to="/settings/website/leads"
                    className="inline-flex items-center px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Lead-uri
                  </Link>

                  {websiteUrl && (
                    <button
                      onClick={() => window.open(websiteUrl, '_blank')}
                      className="inline-flex items-center px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Viziteaza
                    </button>
                  )}

                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      website.isPublished
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {website.isPublished ? 'Publicat' : 'Draft'}
                  </span>

                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className={`inline-flex items-center px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                      website.isPublished
                        ? 'border border-gray-200 hover:bg-gray-50'
                        : 'bg-primary text-white hover:bg-orange-600'
                    }`}
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : website.isPublished ? (
                      'Retrage'
                    ) : (
                      'Publica'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {hasWebsite ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Pages Tab */}
          {activeTab === 'pages' && (
            <div className="grid grid-cols-12 gap-6">
              {/* Pages Sidebar */}
              <div className="col-span-3">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold">Pagini</h3>
                    <button
                      onClick={() => setShowNewPageDialog(true)}
                      className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-2">
                    {pagesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {pages.map((page) => (
                          <div
                            key={page.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedPageId === page.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedPageId(page.id)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-sm">{page.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                  page.isPublished
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {page.isPublished ? 'Live' : 'Draft'}
                              </span>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenPageMenuId(openPageMenuId === page.id ? null : page.id);
                                  }}
                                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </button>
                                {openPageMenuId === page.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={() => setOpenPageMenuId(null)}
                                    />
                                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPageId(page.id);
                                          setActiveTab('pages');
                                          setOpenPageMenuId(null);
                                        }}
                                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editeaza
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTogglePagePublish(page);
                                          setOpenPageMenuId(null);
                                        }}
                                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        {page.isPublished ? (
                                          <>
                                            <EyeOff className="h-4 w-4 mr-2" />
                                            Retrage
                                          </>
                                        ) : (
                                          <>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Publica
                                          </>
                                        )}
                                      </button>
                                      {page.pageType !== 'HOME' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPageId(page.id);
                                            setShowDeletePageDialog(true);
                                            setOpenPageMenuId(null);
                                          }}
                                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Sterge
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Editor Area */}
              <div className="col-span-9">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {selectedPage ? (
                    <div className="h-[calc(100vh-250px)]">
                      {/* Editor Header */}
                      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                        <div>
                          {editingTitle ? (
                            <input
                              type="text"
                              value={pageTitleDraft}
                              onChange={(e) => setPageTitleDraft(e.target.value)}
                              onBlur={handleSavePageTitle}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSavePageTitle();
                                }
                                if (e.key === 'Escape') {
                                  setEditingTitle(false);
                                }
                              }}
                              autoFocus
                              className="font-semibold text-lg px-2 py-1 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          ) : (
                            <h2
                              className="font-semibold flex items-center gap-2 cursor-pointer group"
                              onClick={() => {
                                setEditingTitle(true);
                                setPageTitleDraft(selectedPage.title);
                              }}
                            >
                              {selectedPage.title}
                              <Pencil className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h2>
                          )}
                          <p className="text-sm text-gray-500">/{selectedPage.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isDirty && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700">
                              Modificari nesalvate
                            </span>
                          )}
                          <button
                            onClick={() => setShowPageSeo(!showPageSeo)}
                            className={`inline-flex items-center px-3 py-2 text-sm border rounded-lg transition-colors ${
                              showPageSeo
                                ? 'border-blue-400 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Search className="h-4 w-4 mr-2" />
                            SEO
                          </button>
                          <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className="inline-flex items-center px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {previewMode ? 'Editeaza' : 'Preview'}
                          </button>
                          <button
                            onClick={handleSavePage}
                            disabled={!isDirty || isUpdatingPage}
                            className="inline-flex items-center px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                          >
                            {isUpdatingPage ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Salveaza
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Page SEO Panel */}
                      {showPageSeo && (
                        <div className="h-[calc(100%-65px)] overflow-y-auto p-6 bg-gray-50">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                              Setari SEO - {selectedPage.title}
                            </h3>
                            <button
                              onClick={() => setShowPageSeo(false)}
                              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                          <PageSeoSettings
                            pageSeo={selectedPage.seo || {}}
                            onSave={handleSavePageSeo}
                            isLoading={isUpdatingPage}
                          />
                        </div>
                      )}

                      {/* Block Editor */}
                      {!showPageSeo && (
                        <div className="h-[calc(100%-65px)]">
                          <BlockEditor
                            blocks={blocks}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={setSelectedBlockId}
                            onAddBlock={addBlock}
                            onUpdateBlock={updateBlock}
                            onRemoveBlock={removeBlock}
                            onMoveBlock={moveBlock}
                            onDuplicateBlock={duplicateBlock}
                            crmData={crmData}
                            previewMode={previewMode}
                            onTogglePreview={() => setPreviewMode(!previewMode)}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                      <FileText className="h-12 w-12 text-gray-300 mb-4" />
                      <p>Selecteaza o pagina pentru editare</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <BrandingSettings
              branding={website?.branding}
              onChange={(branding) => handleUpdateWebsite({ branding })}
              isLoading={isUpdating}
            />
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <SeoSettings
              seoDefaults={website?.seoDefaults}
              siteName={user?.organization?.name}
              onChange={(seoDefaults) => handleUpdateWebsite({ seoDefaults })}
              isLoading={isUpdating}
            />
          )}

          {/* Header & Footer Tab */}
          {activeTab === 'layout' && (
            <HeaderFooterSettings
              theme={website?.theme}
              onChange={(theme) => handleUpdateWebsite({ theme })}
              isLoading={isUpdating}
            />
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <TemplateSelector
              selectedSector={user?.organization?.activitySector}
              currentTemplateId={website?.templateId}
              onSelect={(template) => {
                if (template) {
                  setShowTemplateConfirm(template);
                }
              }}
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Creeaza website-ul tau</h2>
            <p className="text-gray-500 mb-6">
              Configureaza un website profesional in cateva minute
            </p>
            <button
              onClick={() => setShowSetupDialog(true)}
              className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Incepe acum
            </button>
          </div>
        </div>
      )}

      {/* Setup Dialog */}
      {showSetupDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSetupDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Creeaza website-ul</h3>
                <p className="text-gray-500 text-sm">
                  Alege un subdomain si optional un template pentru a incepe
                </p>
              </div>
              <button
                onClick={() => setShowSetupDialog(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 py-4">
              <div>
                <label className="text-sm font-medium">Subdomain</label>
                <div className="flex mt-1">
                  <div className="flex max-w-[50%] items-center truncate rounded-l-lg border border-r-0 border-gray-200 bg-gray-100 px-3 text-sm text-gray-600">
                    {runtimeConfig.websiteUrl.replace(/^https?:\/\//, '')}/
                  </div>
                  <input
                    type="text"
                    value={setupSubdomain}
                    onChange={handleSetupSubdomainChange}
                    placeholder="compania-ta"
                    className="min-w-0 flex-1 rounded-r-lg border border-gray-200 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="mt-1 text-sm">
                  {isChecking && (
                    <span className="text-gray-500">Se verifica disponibilitatea...</span>
                  )}
                  {!isChecking && setupSubdomain.length >= 3 && isAvailable && (
                    <span className="text-green-600">Subdomain disponibil!</span>
                  )}
                  {!isChecking && setupSubdomain.length >= 3 && isAvailable === false && (
                    <span className="text-red-600">Subdomain indisponibil</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Alege un template (optional)</label>
                <div className="mt-2 grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                  <button
                    onClick={() => handleCreateWebsite(null)}
                    disabled={
                      !setupSubdomain ||
                      setupSubdomain.length < 3 ||
                      isAvailable === false ||
                      isCreating
                    }
                    className="p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all text-center disabled:opacity-50"
                  >
                    <Layout className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="font-medium text-sm">Pagina goala</p>
                    <p className="text-xs text-gray-500">Incepe de la zero</p>
                  </button>

                  {(getTemplatesBySector(user?.organization?.activitySector).length > 0
                    ? [
                        ...getTemplatesBySector(user?.organization?.activitySector),
                        ...allTemplates.filter(
                          (t) => t.sector !== user?.organization?.activitySector
                        ),
                      ]
                    : allTemplates
                  ).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleCreateWebsite(template)}
                      disabled={
                        !setupSubdomain ||
                        setupSubdomain.length < 3 ||
                        isAvailable === false ||
                        isCreating
                      }
                      className="border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all text-left disabled:opacity-50 overflow-hidden"
                    >
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowSetupDialog(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anuleaza
              </button>
              <button
                onClick={() => handleCreateWebsite(null)}
                disabled={
                  !setupSubdomain ||
                  setupSubdomain.length < 3 ||
                  isAvailable === false ||
                  isCreating ||
                  isCreatingPages
                }
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isCreating || isCreatingPages ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isCreatingPages ? 'Se creeaza paginile...' : 'Se creeaza...'}
                  </span>
                ) : (
                  'Creeaza website'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Page Dialog */}
      {showNewPageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowNewPageDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adauga pagina noua</h3>
              <button
                onClick={() => setShowNewPageDialog(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-4">
              <label className="text-sm font-medium">Titlu pagina</label>
              <input
                type="text"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder="Ex: Despre noi, Contact, Servicii"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewPageDialog(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anuleaza
              </button>
              <button
                onClick={handleCreatePage}
                disabled={!newPageTitle.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                Creeaza pagina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Dialog */}
      {showDeletePageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowDeletePageDialog(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Sterge pagina</h3>
            <p className="text-gray-500 mb-6">
              Esti sigur ca vrei sa stergi pagina "{selectedPage?.title}"? Aceasta actiune nu poate
              fi anulata.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeletePageDialog(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anuleaza
              </button>
              <button
                onClick={handleDeletePage}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sterge pagina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Confirm Dialog */}
      {showTemplateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !isApplyingTemplate && setShowTemplateConfirm(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            {isApplyingTemplate ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-1">Se aplica template-ul...</h3>
                <p className="text-gray-500 text-sm">
                  Se actualizeaza paginile si setarile website-ului
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  Aplica template: {showTemplateConfirm.name}
                </h3>
                <p className="text-gray-500 mb-2">
                  Aceasta actiune va actualiza branding-ul si setarile SEO ale website-ului.
                </p>
                <p className="text-gray-500 mb-6">
                  Paginile existente cu acelasi slug vor fi suprascrise cu continutul din template.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowTemplateConfirm(null)}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Anuleaza
                  </button>
                  <button
                    onClick={() => handleApplyTemplate(showTemplateConfirm)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Aplica template
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Helper Widget - only when website exists */}
      {hasWebsite && (
        <FloatingHelperWidget
          selectedBlockType={blocks.find((b) => b.id === selectedBlockId)?.type || null}
        />
      )}
    </div>
  );
};

export default WebsiteBuilder;

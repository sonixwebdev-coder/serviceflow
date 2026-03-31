import { useState, useEffect } from 'react';
import {
  Mail,
  Edit2,
  Send,
  Check,
  X,
  AlertCircle,
  Code,
  Eye,
  Save,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  useEmailTemplates,
  useEmailTemplate,
  useUpdateEmailTemplate,
  useSendTestEmail,
} from '../hooks/useEmailTemplates';
import { TEMPLATE_VARIABLES } from '../services/emailTemplateService';
import DOMPurify from 'dompurify';
import useToast from '../context/useToast';
import useAuth from '../context/useAuth';

const EmailTemplates = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    bodyHtml: '',
    bodyText: '',
    isActive: true,
  });

  // Queries and mutations
  const { data: templates, isLoading } = useEmailTemplates();
  const { data: templateDetails, isLoading: detailsLoading } = useEmailTemplate(
    selectedTemplate,
    { enabled: Boolean(selectedTemplate) }
  );
  const updateMutation = useUpdateEmailTemplate();
  const sendTestMutation = useSendTestEmail();

  // Update form when template details load
  useEffect(() => {
    if (templateDetails) {
      setFormData({
        subject: templateDetails.subject || '',
        bodyHtml: templateDetails.bodyHtml || '',
        bodyText: templateDetails.bodyText || '',
        isActive: templateDetails.isActive !== false,
      });
      setPreviewHtml(templateDetails.bodyHtml || '');
    }
  }, [templateDetails]);

  const handleSelectTemplate = (name) => {
    setSelectedTemplate(name);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (templateDetails) {
      setFormData({
        subject: templateDetails.subject || '',
        bodyHtml: templateDetails.bodyHtml || '',
        bodyText: templateDetails.bodyText || '',
        isActive: templateDetails.isActive !== false,
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        name: selectedTemplate,
        data: formData,
      });
      showToast({
        title: 'Succes',
        description: 'Template-ul a fost salvat',
        type: 'success',
      });
      setIsEditing(false);
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut salva template-ul',
        type: 'error',
      });
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      showToast({
        title: 'Eroare',
        description: 'Introduceti o adresa de email',
        type: 'error',
      });
      return;
    }

    try {
      await sendTestMutation.mutateAsync({
        templateName: selectedTemplate,
        toEmail: testEmail,
      });
      showToast({
        title: 'Succes',
        description: `Email-ul de test a fost trimis la ${testEmail}`,
        type: 'success',
      });
      setShowTestModal(false);
      setTestEmail('');
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut trimite email-ul',
        type: 'error',
      });
    }
  };

  const insertVariable = (variableName) => {
    const textarea = document.getElementById('bodyHtml');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.bodyHtml;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = `${before}{{${variableName}}}${after}`;
      setFormData((prev) => ({ ...prev, bodyHtml: newText }));
      // Focus back and set cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableName.length + 4, start + variableName.length + 4);
      }, 0);
    }
  };

  const getTemplateInfo = (name) => TEMPLATE_VARIABLES[name] || { label: name, description: '', variables: [] };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template-uri Email</h1>
          <p className="mt-1 text-sm text-gray-600">
            Personalizeaza continutul email-urilor trimise clientilor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Template-uri Disponibile</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {templates?.map((template) => {
                const info = getTemplateInfo(template.name);
                const isSelected = selectedTemplate === template.name;
                return (
                  <button
                    key={template.name}
                    onClick={() => handleSelectTemplate(template.name)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <Mail className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {info.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                        </div>
                      </div>
                      {template.isActive !== false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activ
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inactiv
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Editor Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {getTemplateInfo(selectedTemplate).label}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {getTemplateInfo(selectedTemplate).description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => setShowTestModal(true)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Send className="w-4 h-4 mr-1.5" />
                        Trimite Test
                      </button>
                      <button
                        onClick={handleEdit}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 mr-1.5" />
                        Editeaza
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Anuleaza
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        {updateMutation.isPending ? 'Se salveaza...' : 'Salveaza'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {detailsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Active Toggle */}
                  {isEditing && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Status Template</p>
                        <p className="text-xs text-gray-500">
                          Template-urile inactive nu vor trimite email-uri
                        </p>
                      </div>
                      <button
                        onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.isActive ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subiect Email
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ex: Confirmare programare - {{date}}"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                        {formData.subject || <span className="text-gray-400">Subiect default</span>}
                      </div>
                    )}
                  </div>

                  {/* Variables Reference */}
                  <div>
                    <button
                      onClick={() => setShowVariables(!showVariables)}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      <Code className="w-4 h-4" />
                      Variabile Disponibile
                      {showVariables ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {showVariables && (
                      <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 mb-3">
                          Click pe o variabila pentru a o insera in editor (in modul editare)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {getTemplateInfo(selectedTemplate).variables.map((variable) => (
                            <button
                              key={variable.name}
                              onClick={() => isEditing && insertVariable(variable.name)}
                              disabled={!isEditing}
                              className={`text-left p-2 rounded border ${
                                isEditing
                                  ? 'bg-white border-blue-200 hover:border-blue-400 cursor-pointer'
                                  : 'bg-blue-50 border-blue-100 cursor-default'
                              }`}
                            >
                              <code className="text-xs font-mono text-blue-600">
                                {'{{'}
                                {variable.name}
                                {'}}'}
                              </code>
                              <p className="text-xs text-gray-600 mt-0.5">{variable.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* HTML Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Continut HTML
                    </label>
                    {isEditing ? (
                      <textarea
                        id="bodyHtml"
                        value={formData.bodyHtml}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, bodyHtml: e.target.value }));
                          setPreviewHtml(e.target.value);
                        }}
                        rows={15}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="<html>...</html>"
                      />
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Previzualizare</span>
                        </div>
                        <div
                          className="p-4 bg-white max-h-96 overflow-auto"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Plain Text Body (optional) */}
                  {isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Continut Text (optional)
                        <span className="font-normal text-gray-500 ml-1">
                          - folosit pentru clientii de email care nu suporta HTML
                        </span>
                      </label>
                      <textarea
                        value={formData.bodyText}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bodyText: e.target.value }))}
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Versiune text simplu..."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecteaza un template
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Alege un template din lista din stanga pentru a-l vizualiza si edita.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowTestModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Trimite Email de Test
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Trimite un email de test folosind template-ul "{getTemplateInfo(selectedTemplate).label}"
                cu date de exemplu.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresa Email
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={user?.email || 'email@exemplu.com'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Anuleaza
                </button>
                <button
                  onClick={handleSendTest}
                  disabled={sendTestMutation.isPending}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {sendTestMutation.isPending ? 'Se trimite...' : 'Trimite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;

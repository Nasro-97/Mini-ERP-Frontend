import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Save, Building2, Eye, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToast } from '../components/Toast';

interface Settings {
  company_email: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
  rfq_email_template: string | null;
  technical_offer_template: string | null;
  commercial_offer_template: string | null;
  po_template: string | null;
}

const cardBase: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #E5E7EB',
  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  color: '#1F2937',
  outline: 'none',
};

const codeAreaStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  color: '#1F2937',
  outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '12px',
  lineHeight: '1.6',
  backgroundColor: '#F9FAFB',
  resize: 'vertical',
};

const PDF_TABS = [
  { key: 'technical_offer_template', label: 'Technical Offer' },
  { key: 'commercial_offer_template', label: 'Commercial Offer' },
  { key: 'po_template', label: 'Purchase Order' },
] as const;

const VARIABLES_HELP = 'Available variables: {{company}}, {{request}}, {{supplier}}, {{quotation}}, {{offer}}, {{po}}, {{document}}';

export const SystemSettingsPage: React.FC = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activePdfTab, setActivePdfTab] = useState<typeof PDF_TABS[number]['key']>('technical_offer_template');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [rfqTemplate, setRfqTemplate] = useState('');
  const [pdfTemplates, setPdfTemplates] = useState({
    technical_offer_template: '',
    commercial_offer_template: '',
    po_template: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiClient.get<Settings>('/settings');
      setCompanyEmail(data.company_email ?? '');
      setCompanyPhone(data.company_phone ?? '');
      setLogoUrl(data.company_logo_url ?? null);
      setRfqTemplate(data.rfq_email_template ?? '');
      setPdfTemplates({
        technical_offer_template: data.technical_offer_template ?? '',
        commercial_offer_template: data.commercial_offer_template ?? '',
        po_template: data.po_template ?? '',
      });
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      await apiClient.patch('/settings', {
        company_email: companyEmail,
        company_phone: companyPhone,
      });
      toast.success('Company information saved');
    } catch {
      toast.error('Failed to save company information');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/settings/logo', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      setLogoUrl(data.company_logo_url ?? null);
      toast.success('Logo uploaded successfully');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveEmailTemplate = async () => {
    setSavingEmail(true);
    try {
      await apiClient.patch('/settings', { rfq_email_template: rfqTemplate });
      toast.success('RFQ email template saved');
    } catch {
      toast.error('Failed to save email template');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePdfTemplate = async () => {
    setSavingPdf(true);
    try {
      await apiClient.patch('/settings', { [activePdfTab]: pdfTemplates[activePdfTab] });
      toast.success('PDF template saved');
    } catch {
      toast.error('Failed to save PDF template');
    } finally {
      setSavingPdf(false);
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#4C5FD5';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76,95,213,0.1)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#E5E7EB';
    e.currentTarget.style.boxShadow = 'none';
  };

  const SaveButton = ({
    onClick,
    loading: busy,
    label = 'Save Changes',
  }: {
    onClick: () => void;
    loading: boolean;
    label?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
      style={{
        background: busy ? '#9CA3AF' : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
        cursor: busy ? 'not-allowed' : 'pointer',
      }}
    >
      <Save size={14} />
      {busy ? 'Saving...' : label}
    </button>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '100vh', backgroundColor: '#F5F7FA' }}>
        <span style={{ color: '#9CA3AF' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-5xl mx-auto">

        {/* Back link */}
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 mb-4 text-sm font-medium transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#4C5FD5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; }}
        >
          <ArrowLeft size={16} />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>System Settings</h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Configure company information, email templates, and PDF layouts</p>
        </div>

        <div className="space-y-6">

          {/* ── Company Information ── */}
          <div className="p-6 rounded-xl" style={cardBase}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)' }}>
                <Building2 size={18} style={{ color: '#ffffff' }} />
              </div>
              <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>Company Information</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Company Email</label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="company@example.com"
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Company Phone Number</label>
                  <input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-sm rounded-lg"
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
                <SaveButton onClick={handleSaveCompany} loading={savingCompany} />
              </div>

              {/* Right: logo */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>Company Logo</label>
                <div
                  className="rounded-xl flex flex-col items-center justify-center gap-3 p-6"
                  style={{ border: '2px dashed #E5E7EB', backgroundColor: '#F9FAFB', minHeight: '140px' }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="max-h-20 max-w-full object-contain rounded"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                      <Building2 size={24} style={{ color: '#9CA3AF' }} />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#4C5FD5',
                      border: '1px solid #4C5FD5',
                      cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                      opacity: uploadingLogo ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { if (!uploadingLogo) { e.currentTarget.style.backgroundColor = '#4C5FD5'; e.currentTarget.style.color = '#ffffff'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#4C5FD5'; }}
                  >
                    <Upload size={14} />
                    {uploadingLogo ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>PNG, JPG, WEBP, or SVG supported</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </div>

          {/* ── RFQ Email Template ── */}
          <div className="p-6 rounded-xl" style={cardBase}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>RFQ Email Template</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewHtml(rfqTemplate)}
                  disabled={!rfqTemplate.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{
                    backgroundColor: '#ffffff',
                    color: rfqTemplate.trim() ? '#4C5FD5' : '#9CA3AF',
                    border: `1px solid ${rfqTemplate.trim() ? '#4C5FD5' : '#E5E7EB'}`,
                    cursor: rfqTemplate.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Eye size={14} />
                  Preview
                </button>
                <SaveButton onClick={handleSaveEmailTemplate} loading={savingEmail} />
              </div>
            </div>
            <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>{VARIABLES_HELP}</p>
            <textarea
              value={rfqTemplate}
              onChange={(e) => setRfqTemplate(e.target.value)}
              rows={16}
              placeholder="<!-- Write your RFQ email HTML template here -->"
              className="w-full px-4 py-3 text-sm rounded-lg"
              style={codeAreaStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* ── PDF Templates ── */}
          <div className="p-6 rounded-xl" style={cardBase}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>PDF Templates</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewHtml(pdfTemplates[activePdfTab])}
                  disabled={!pdfTemplates[activePdfTab].trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{
                    backgroundColor: '#ffffff',
                    color: pdfTemplates[activePdfTab].trim() ? '#4C5FD5' : '#9CA3AF',
                    border: `1px solid ${pdfTemplates[activePdfTab].trim() ? '#4C5FD5' : '#E5E7EB'}`,
                    cursor: pdfTemplates[activePdfTab].trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Eye size={14} />
                  Preview
                </button>
                <SaveButton onClick={handleSavePdfTemplate} loading={savingPdf} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: '#F3F4F6' }}>
              {PDF_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActivePdfTab(tab.key)}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all"
                  style={
                    activePdfTab === tab.key
                      ? { backgroundColor: '#ffffff', color: '#4C5FD5', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }
                      : { color: '#6B7280', backgroundColor: 'transparent' }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>{VARIABLES_HELP}</p>
            <textarea
              value={pdfTemplates[activePdfTab]}
              onChange={(e) => setPdfTemplates((prev) => ({ ...prev, [activePdfTab]: e.target.value }))}
              rows={20}
              placeholder={`<!-- Write your ${PDF_TABS.find(t => t.key === activePdfTab)?.label} HTML template here -->`}
              className="w-full px-4 py-3 text-sm rounded-lg"
              style={codeAreaStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

        </div>
      </div>

      {/* Preview Modal */}
      {previewHtml !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setPreviewHtml(null)}
        >
          <div
            className="rounded-xl overflow-hidden flex flex-col"
            style={{
              width: '90vw',
              height: '85vh',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'scaleIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>Template Preview</span>
              <button
                onClick={() => setPreviewHtml(null)}
                className="p-1 rounded-lg transition-colors hover:bg-gray-100"
              >
                <X size={18} style={{ color: '#6B7280' }} />
              </button>
            </div>
            {/* iframe renders the HTML */}
            <iframe
              className="flex-1 w-full"
              srcDoc={previewHtml}
              sandbox="allow-same-origin"
              title="Template Preview"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

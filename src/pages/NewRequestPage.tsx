import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '../api/client';
import { DatePicker } from '../components/DatePicker';

interface Client {
  id: string;
  company_name: string;
}

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    client_reference: '',
    priority: 'normal',
    description: '',
    notes: '',
  });

  const [requestDate, setRequestDate] = useState<Date | null>(new Date());
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [requiredDate, setRequiredDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await apiClient.get<Client[]>('/clients/');
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestDate || !deadline || !requiredDate) {
      setError('Please select request date, deadline, and required date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/requests/', {
        request_data: {
          title: formData.title,
          client_id: formData.client_id,
          client_reference: formData.client_reference,
          request_date: requestDate.toISOString(),
          deadline: deadline.toISOString(),
          required_date: requiredDate.toISOString(),
          priority: formData.priority,
          description: formData.description || null,
          notes: formData.notes || null,
        },
        items: [],
      });

      navigate(`/requests/${response.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create request');
      setLoading(false);
    }
  };

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          to="/requests"
          className="inline-flex items-center gap-2 mb-4 text-sm font-medium transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#4C5FD5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <ArrowLeft size={16} />
          Back to Requests
        </Link>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            New Request
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            Create a new client request
          </p>
        </div>

        {/* Form Card */}
        <div
          className="p-6 rounded-xl"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Title <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder="Enter request title"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Client <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                    padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                    height: '38px',
                    lineHeight: '1.5',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                  }}
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Reference */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Client Reference <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.client_reference}
                  onChange={(e) => setFormData({ ...formData, client_reference: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder="Enter client reference number"
                />
              </div>

              {/* Request Date, Deadline & Required Date */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                    Request Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <DatePicker
                    selected={requestDate}
                    onChange={(date) => setRequestDate(date)}
                    placeholder="Select request date"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                    Deadline <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <DatePicker
                    selected={deadline}
                    onChange={(date) => setDeadline(date)}
                    placeholder="Select deadline"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                    Required Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <DatePicker
                    selected={requiredDate}
                    onChange={(date) => setRequiredDate(date)}
                    placeholder="Select required date"
                    required
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                    padding: '0.5rem 2.5rem 0.5rem 0.75rem',
                    height: '38px',
                    lineHeight: '1.5',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder="Enter request description"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#1F2937' }}>
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E5E7EB',
                    color: '#1F2937',
                  }}
                  placeholder="Add any additional notes"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
                >
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Link
                  to="/requests"
                  className="px-5 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#1F2937',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E5E7EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all"
                  style={{
                    background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #4C5FD5 0%, #6366F1 100%)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

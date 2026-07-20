import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { TrendingUp, MoreVertical, Calendar } from 'lucide-react';
import { apiClient } from '../api/client';

interface Request {
  id: string;
  request_number: string;
  title: string;
  status: string;
  priority: string;
  client_id: string;
  created_at: string;
}

interface Offer {
  id: string;
  offer_number: string;
  request_id: string;
  current_version: number;
  status: string;
  created_at: string;
}

type DateFilter = 'day' | 'week' | 'month';

function isWithin(dateStr: string, filter: DateFilter): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  if (filter === 'day') {
    return date.toDateString() === now.toDateString();
  }
  if (filter === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo;
  }
  // month
  const monthAgo = new Date(now);
  monthAgo.setDate(now.getDate() - 30);
  return date >= monthAgo;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsData, offersData] = await Promise.all([
          apiClient.get<Request[]>('/requests/').catch(() => []),
          apiClient.get<Offer[]>('/offers/').catch(() => []),
        ]);
        setRequests(requestsData);
        setOffers(offersData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Active requests = not closed/rejected/delivered
  const activeRequestsCount = requests.filter(
    r => !['closed', 'rejected', 'delivered'].includes(r.status)
  ).length;

  // Offers in progress = requests currently in offer-related statuses
  const offersInProgressCount = requests.filter(
    r => ['offer_in_progress', 'approved_by_client'].includes(r.status)
  ).length;

  // POs in progress = requests currently in PO-related statuses
  const posInProgressCount = requests.filter(
    r => ['po_in_progress'].includes(r.status)
  ).length;

  const statusGroups = {
    active: requests.filter(r =>
      ['draft', 'submitted', 'pending_sales_manager_approval', 'approved_for_sourcing'].includes(r.status)
    ).length,
    inProgress: requests.filter(r =>
      ['rfq_in_progress', 'quotation_review', 'offer_in_progress', 'approved_by_client', 'po_in_progress', 'shipment_in_progress'].includes(r.status)
    ).length,
    completed: requests.filter(r =>
      ['delivered', 'closed'].includes(r.status)
    ).length,
  };

  const totalRequests = requests.length;

  const statusPercentages = {
    active: totalRequests > 0 ? (statusGroups.active / totalRequests) * 100 : 0,
    inProgress: totalRequests > 0 ? (statusGroups.inProgress / totalRequests) * 100 : 0,
    completed: totalRequests > 0 ? (statusGroups.completed / totalRequests) * 100 : 0,
  };

  const filteredRequests = requests
    .filter(r => isWithin(r.created_at, dateFilter))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const recentOffers = offers.slice(0, 6);

  return (
    <div className="p-6" style={{ backgroundColor: '#F5F7FA', minHeight: '100vh', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Greeting Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#1F2937' }}>
            {getGreeting()}, {user?.username || 'User'}
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            {getCurrentDate()}
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Active Requests */}
        <div
          className="p-5 rounded-xl transition-all relative overflow-hidden"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px 0 rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)'; }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)', transform: 'translate(40%,-40%)' }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Active Requests</span>
              <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={16} /></button>
            </div>
            <div className="text-3xl font-bold mb-2" style={{ color: '#1F2937' }}>{activeRequestsCount}</div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
              <TrendingUp size={12} /> Active
            </span>
          </div>
        </div>

        {/* Offers in Progress */}
        <div
          className="p-5 rounded-xl transition-all relative overflow-hidden"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px 0 rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)'; }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)', transform: 'translate(40%,-40%)' }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Offers in Progress</span>
              <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={16} /></button>
            </div>
            <div className="text-3xl font-bold mb-2" style={{ color: '#1F2937' }}>{offersInProgressCount}</div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
              <TrendingUp size={12} /> In Progress
            </span>
          </div>
        </div>

        {/* Purchase Orders */}
        <div
          className="p-5 rounded-xl transition-all relative overflow-hidden"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px 0 rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)'; }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0) 70%)', transform: 'translate(40%,-40%)' }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Purchase Orders</span>
              <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={16} /></button>
            </div>
            <div className="text-3xl font-bold mb-2" style={{ color: '#1F2937' }}>{posInProgressCount}</div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              <TrendingUp size={12} /> In Progress
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Recent Requests & Requests by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        {/* Recent Requests */}
        <div className="lg:col-span-3 p-5 rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>Recent Requests</h2>
            <div className="flex items-center gap-1">
              {(['day', 'week', 'month'] as DateFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize"
                  style={{
                    backgroundColor: dateFilter === f ? '#4C5FD5' : '#F9FAFB',
                    color: dateFilter === f ? '#ffffff' : '#9CA3AF',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <th className="text-left py-2.5 px-3 text-xs font-medium" style={{ color: '#9CA3AF' }}>Request #</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium" style={{ color: '#9CA3AF' }}>Title</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium" style={{ color: '#9CA3AF' }}>Status</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium" style={{ color: '#9CA3AF' }}>Priority</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium" style={{ color: '#9CA3AF' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8" style={{ color: '#9CA3AF' }}>Loading...</td></tr>
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8" style={{ color: '#9CA3AF' }}>No requests in this period</td></tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid #F9FAFB' }}
                      onClick={() => navigate(`/requests/${request.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td className="py-2.5 px-3 text-sm font-medium" style={{ color: '#4C5FD5' }}>
                        {request.request_number}
                      </td>
                      <td className="py-2.5 px-3 text-sm" style={{ color: '#1F2937' }}>
                        {request.title || 'Untitled'}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: request.priority === 'high' ? '#FEE2E2' : '#F3F4F6',
                            color: request.priority === 'high' ? '#DC2626' : '#6B7280',
                          }}
                        >
                          {request.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-sm" style={{ color: '#9CA3AF' }}>
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Requests by Status */}
        <div className="lg:col-span-2 p-5 rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          <h2 className="text-base font-semibold mb-5" style={{ color: '#1F2937' }}>Requests by Status</h2>

          <div className="text-center mb-5">
            <div className="text-3xl font-bold mb-1" style={{ color: '#1F2937' }}>{totalRequests}</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>Total Requests</div>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden flex mb-5" style={{ backgroundColor: '#F3F4F6' }}>
            <div className="h-full transition-all" style={{ width: `${statusPercentages.active}%`, backgroundColor: '#4C5FD5' }} />
            <div className="h-full transition-all" style={{ width: `${statusPercentages.inProgress}%`, backgroundColor: '#F59E0B' }} />
            <div className="h-full transition-all" style={{ width: `${statusPercentages.completed}%`, backgroundColor: '#10B981' }} />
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Active', color: '#4C5FD5', count: statusGroups.active },
              { label: 'In Progress', color: '#F59E0B', count: statusGroups.inProgress },
              { label: 'Completed', color: '#10B981', count: statusGroups.completed },
            ].map(({ label, color, count }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm" style={{ color: '#6B7280' }}>{label}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Offers */}
      <div className="grid grid-cols-1 gap-5">
        <div className="p-5 rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#1F2937' }}>Recent Offers</h2>
            <button className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
              <Calendar size={12} />
              Last 30 days
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <th className="text-left py-2.5 px-3 text-xs font-medium" style={{ color: '#9CA3AF' }}>Offer #</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium" style={{ color: '#9CA3AF' }}>Version</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium" style={{ color: '#9CA3AF' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="text-center py-8" style={{ color: '#9CA3AF' }}>Loading...</td></tr>
                ) : recentOffers.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-8" style={{ color: '#9CA3AF' }}>No offers yet</td></tr>
                ) : (
                  recentOffers.map((offer) => (
                    <tr
                      key={offer.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid #F9FAFB' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td className="py-2.5 px-3 text-sm font-medium" style={{ color: '#4C5FD5' }}>{offer.offer_number}</td>
                      <td className="py-2.5 px-3 text-sm" style={{ color: '#1F2937' }}>v{offer.current_version}</td>
                      <td className="py-2.5 px-3 text-sm" style={{ color: '#9CA3AF' }}>{new Date(offer.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    industry: ''
  });

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/crm/clients');
      setClients(res.data?.data?.clients || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      alert(error.response?.data?.message || 'Could not load clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (clientData = null) => {
    if (clientData) {
      setEditingId(clientData.id);
      setFormData({
        company_name: clientData.company_name,
        contact_person: clientData.contact_person,
        email: clientData.email,
        phone: clientData.phone,
        industry: clientData.industry || ''
      });
    } else {
      setEditingId(null);
      setFormData({ company_name: '', contact_person: '', email: '', phone: '', industry: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await client.put(`/crm/clients/${editingId}`, formData);
      } else {
        await client.post('/crm/clients', formData);
      }
      await fetchClients();
      closeModal();
    } catch (error) {
      console.error("Failed to save client:", error);
      alert(error.response?.data?.message || "An error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id, isArchived) => {
  const action = isArchived ? "unarchive" : "archive";

  if (!window.confirm(`Are you sure you want to ${action} this client?`)) {
    return;
  }

  try {
    await client.patch(`/crm/clients/${id}/archive`);
    await fetchClients();
  } catch (error) {
    console.error(`Failed to ${action} client:`, error);
    alert(error.response?.data?.message || `Could not ${action} client.`);
  }
};

  const columns = useMemo(() => [
    { header: 'Company Name', accessor: 'company_name' },
    { header: 'Contact', accessor: 'contact_person' },
    { header: 'Email', accessor: 'email' },
    { header: 'Industry', accessor: 'industry' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
          row.status === 'Archived' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {row.status || 'Active'}
        </span>
      )
    },
    {
  header: 'Actions',
  accessor: 'id',
  render: (row) => (
    <div className="flex space-x-3">
      <button
        onClick={() => openModal(row)}
        className="text-brand-primary hover:text-indigo-800 text-sm font-medium transition-colors"
      >
        Edit
      </button>

      <button
        onClick={() => handleArchive(row.id, row.status === 'Archived')}
        className={`text-sm font-medium transition-colors ${
          row.status === 'Archived'
            ? 'text-emerald-600 hover:text-emerald-800'
            : 'text-slate-400 hover:text-red-600'
        }`}
      >
        {row.status === 'Archived' ? 'Unarchive' : 'Archive'}
      </button>
    </div>
  )
}
], [handleArchive]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage corporate accounts and contact details.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-brand-primary hover:bg-indigo-700 shadow-sm transition-colors"
        >
          + Add New Client
        </button>
      </div>

      {/* Main Data View */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm font-medium animate-pulse">
          Loading client registry...
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={clients} 
          searchField="company_name" 
          filterField="status"
          filterOptions={['Active', 'Archived']} 
        />
      )}

      {/* Slide-over / Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingId ? 'Edit Client Details' : 'Register New Client'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Company Name</label>
                <input type="text" name="company_name" required value={formData.company_name} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Contact Person</label>
                  <input type="text" name="contact_person" required value={formData.contact_person} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Industry</label>
                  <input type="text" name="industry" value={formData.industry} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Email</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {submitting ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;

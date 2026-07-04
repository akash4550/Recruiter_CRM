import React, { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  assigned_fields: '',
  status: 'Active',
};

const RecruitersPage = () => {
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecruiters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await client.get('/crm/recruiters');
      setRecruiters(response.data?.data?.recruiters || []);
    } catch (error) {
      console.error('Failed to fetch recruiters:', error);
      alert(error.response?.data?.message || 'Could not load recruiters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecruiters();
  }, [fetchRecruiters]);

  const openModal = (recruiter = null) => {
    if (recruiter) {
      setEditingId(recruiter.id);
      setFormData({
        name: recruiter.name || '',
        email: recruiter.email || '',
        password: '',
        assigned_fields: Array.isArray(recruiter.assigned_fields)
          ? recruiter.assigned_fields.join(', ')
          : '',
        status: recruiter.user_status || 'Active',
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const buildPayload = () => {
    const assignedFields = formData.assigned_fields
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);

    const payload = {
      name: formData.name,
      email: formData.email,
      assigned_fields: assignedFields,
      status: formData.status,
    };

    if (!editingId) {
      payload.password = formData.password;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = buildPayload();

      if (editingId) {
        await client.put(`/crm/recruiters/${editingId}`, payload);
      } else {
        await client.post('/crm/recruiters', payload);
      }

      await fetchRecruiters();
      closeModal();
    } catch (error) {
      console.error('Failed to save recruiter:', error);
      alert(error.response?.data?.message || 'Could not save recruiter.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recruiter) => {
    const confirmed = window.confirm(`Delete recruiter ${recruiter.name}? This also removes their login.`);
    if (!confirmed) return;

    try {
      await client.delete(`/crm/recruiters/${recruiter.id}`);
      await fetchRecruiters();
    } catch (error) {
      console.error('Failed to delete recruiter:', error);
      alert(error.response?.data?.message || 'Could not delete recruiter.');
    }
  };

  const columns = useMemo(() => [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Assigned Fields',
      accessor: 'assigned_fields',
      render: (row) => Array.isArray(row.assigned_fields) && row.assigned_fields.length
        ? row.assigned_fields.join(', ')
        : 'Unassigned',
    },
    { header: 'Open Positions', accessor: 'open_positions' },
    {
      header: 'Status',
      accessor: 'user_status',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.user_status === 'Inactive' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {row.user_status}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openModal(row)}
            className="text-brand-primary hover:text-indigo-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="text-slate-400 hover:text-red-600 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Recruiter Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage recruiter access, assigned fields, and workload.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
        >
          Add Recruiter
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm font-medium animate-pulse">
          Loading recruiter roster...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={recruiters}
          searchField="name"
          filterField="user_status"
          filterOptions={['Active', 'Inactive']}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingId ? 'Edit Recruiter' : 'Add Recruiter'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Name</label>
                  <input
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {!editingId && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Assigned Fields</label>
                <input
                  name="assigned_fields"
                  value={formData.assigned_fields}
                  onChange={handleInputChange}
                  placeholder="Java, React, Sales hiring"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-primary focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Recruiter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitersPage;

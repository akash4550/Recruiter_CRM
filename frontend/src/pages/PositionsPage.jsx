import React, { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';

const emptyForm = {
  client_id: '',
  recruiter_id: '',
  job_title: '',
  technology: '',
  experience: '',
  location: '',
  salary_min: 0,
  salary_max: 0,
  currency: 'INR',
  employment_type: '',
  openings: 1,
  status: 'Open',
};

const PositionsPage = () => {
  const [positions, setPositions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  const fetchPositions = useCallback(async () => {
    try {
      const response = await client.get('/crm/positions');
      setPositions(response.data?.data?.positions || []);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Could not load positions.');
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await client.get('/crm/clients?status=Active&limit=100');
      setClients(response.data?.data?.clients || []);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Could not load clients for positions.');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPositions(), fetchClients()]);
      setLoading(false);
    };

    loadData();
  }, [fetchClients, fetchPositions]);

  const openModal = (position = null) => {
    if (position) {
      setEditingId(position.id);
      setFormData({
        client_id: position.client_id || '',
        recruiter_id: position.recruiter_id || '',
        job_title: position.job_title || '',
        technology: position.technology || '',
        experience: position.experience || '',
        location: position.location || '',
        salary_min: position.salary_min || 0,
        salary_max: position.salary_max || 0,
        currency: position.currency || 'INR',
        employment_type: position.employment_type || '',
        openings: position.openings || 1,
        status: position.status || 'Open',
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm);
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        client_id: Number(formData.client_id),
        recruiter_id: formData.recruiter_id ? Number(formData.recruiter_id) : null,
        job_title: formData.job_title,
        technology: formData.technology || null,
        experience: formData.experience || null,
        location: formData.location || null,
        salary_min: Number(formData.salary_min || 0),
        salary_max: Number(formData.salary_max || 0),
        currency: formData.currency || 'INR',
        employment_type: formData.employment_type || null,
        openings: Number(formData.openings || 1),
        status: formData.status,
      };

      if (editingId) {
        await client.put(`/crm/positions/${editingId}`, payload);
      } else {
        await client.post('/crm/positions', payload);
      }

      await fetchPositions();
      closeModal();
    } catch (error) {
      console.error('Failed to save position:', error);
      setFormError(error.response?.data?.message || 'Unable to save position.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (position) => {
    const confirmed = window.confirm(`Delete position "${position.job_title}"?`);
    if (!confirmed) return;

    try {
      await client.delete(`/crm/positions/${position.id}`);
      await fetchPositions();
    } catch (error) {
      console.error('Failed to delete position:', error);
      alert(error.response?.data?.message || 'Could not delete position.');
    }
  };

  const columns = useMemo(
    () => [
      { header: 'Title', accessor: 'job_title' },
      { header: 'Client', accessor: 'client_name' },
      { header: 'Tech', accessor: 'technology' },
      { header: 'Openings', accessor: 'openings' },
      {
        header: 'Status',
        accessor: 'status',
        render: (row) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${row.status === 'Open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
            {row.status}
          </span>
        ),
      },
      {
        header: 'Actions',
        accessor: 'id',
        render: (row) => (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => openModal(row)} className="text-sm font-medium text-brand-primary hover:text-indigo-800">Edit</button>
            <button type="button" onClick={() => handleDelete(row)} className="text-sm font-medium text-slate-400 hover:text-red-600">Delete</button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Open Positions</h2>
          <p className="text-sm text-slate-500">Manage hiring roles and openings.</p>
        </div>
        <button type="button" onClick={() => openModal()} className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          + Provision Position
        </button>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <DataTable columns={columns} data={positions} searchField="job_title" filterField="status" filterOptions={['Open', 'Closed', 'Paused']} />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              {editingId ? 'Edit Position' : 'Create Position'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Client</label>
                  <select name="client_id" required value={formData.client_id} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="">Select Client</option>
                    {clients.map((item) => (
                      <option key={item.id} value={item.id}>{item.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Recruiter ID</label>
                  <input type="number" name="recruiter_id" value={formData.recruiter_id} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Job Title</label>
                  <input name="job_title" required value={formData.job_title} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Technology</label>
                  <input name="technology" value={formData.technology} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Experience</label>
                  <input name="experience" value={formData.experience} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Location</label>
                  <input name="location" value={formData.location} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Openings</label>
                  <input type="number" min="1" name="openings" value={formData.openings} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Min Salary</label>
                  <input type="number" min="0" name="salary_min" value={formData.salary_min} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Max Salary</label>
                  <input type="number" min="0" name="salary_max" value={formData.salary_max} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Currency</label>
                  <input name="currency" value={formData.currency} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Employment Type</label>
                  <input name="employment_type" value={formData.employment_type} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>

              {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Position'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionsPage;

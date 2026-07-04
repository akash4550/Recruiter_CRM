import React, { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'Employee',
  department: '',
  designation: '',
  joining_date: '',
  reporting_manager_id: '',
  status: 'Active',
};

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await client.get('/crm/employees');
      setEmployees(response.data?.data?.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      alert(error.response?.data?.message || 'Could not load employees.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openModal = (employee = null) => {
    if (employee) {
      setEditingId(employee.id);
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        password: '',
        role: employee.role || 'Employee',
        department: employee.department || '',
        designation: employee.designation || '',
        joining_date: employee.joining_date || '',
        reporting_manager_id: employee.reporting_manager_id || '',
        status: employee.status || 'Active',
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
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department || null,
        designation: formData.designation || null,
        joining_date: formData.joining_date || null,
        reporting_manager_id: formData.reporting_manager_id || null,
        status: formData.status,
      };

      if (!editingId) {
        payload.password = formData.password;
      }

      if (editingId) {
        await client.put(`/crm/employees/${editingId}`, payload);
      } else {
        await client.post('/crm/employees', payload);
      }

      await fetchEmployees();
      closeModal();
    } catch (error) {
      console.error('Failed to save employee:', error);
      setFormError(error.response?.data?.message || 'Unable to save employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(`Remove ${employee.name} from the system?`);
    if (!confirmed) return;

    try {
      await client.delete(`/crm/employees/${employee.id}`);
      await fetchEmployees();
    } catch (error) {
      console.error('Delete failed:', error);
      alert(error.response?.data?.message || 'Could not remove employee.');
    }
  };

  const columns = useMemo(
    () => [
      { header: 'Name', accessor: 'name' },
      { header: 'Email', accessor: 'email' },
      { header: 'Role', accessor: 'role' },
      { header: 'Department', accessor: 'department' },
      {
        header: 'Status',
        accessor: 'status',
        render: (row) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${row.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
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
          <h2 className="text-2xl font-bold text-slate-900">Personnel Roster</h2>
          <p className="text-sm text-slate-500">Manage system access and roles.</p>
        </div>
        <button type="button" onClick={() => openModal()} className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          + Provision User
        </button>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <DataTable columns={columns} data={employees} searchField="name" filterField="status" filterOptions={['Active', 'Inactive']} />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              {editingId ? 'Edit Employee' : 'Add Employee'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Name</label>
                  <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Email</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                {!editingId && (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
                    <input type="password" name="password" required value={formData.password} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Role</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="Employee">Employee</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="HR">HR</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Department</label>
                  <input name="department" value={formData.department} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Designation</label>
                  <input name="designation" value={formData.designation} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Joining Date</label>
                  <input type="date" name="joining_date" value={formData.joining_date} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Reporting Manager ID</label>
                  <input type="number" name="reporting_manager_id" value={formData.reporting_manager_id} onChange={handleInputChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
              </div>

              {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;

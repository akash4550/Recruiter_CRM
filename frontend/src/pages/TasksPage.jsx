import React, { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  title: '',
  description: '',
  client_id: '',
  assigned_to_user_id: '',
  due_date: '',
  priority: 'Medium',
  status: 'Pending',
};

const TasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await client.get('/crm/tasks');
      setTasks(response.data?.data?.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await client.get('/crm/clients?status=Active&limit=100');
      setClients(response.data?.data?.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!['Super Admin', 'Admin', 'HR'].includes(user?.role)) return;

    try {
      const response = await client.get('/crm/employees?limit=100');
      setUsers(response.data?.data?.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees for task assignment:', error);
    }
  }, [user?.role]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchClients(), fetchUsers()]);
      setLoading(false);
    };

    loadData();
  }, [fetchClients, fetchTasks, fetchUsers]);

  const openModal = (task = null) => {
    if (task) {
      setEditingId(task.id);
      setFormData({
        title: task.title || '',
        description: task.description || '',
        client_id: task.client_id || '',
        assigned_to_user_id: task.assigned_to_user_id || user?.id || '',
        due_date: task.due_date || '',
        priority: task.priority || 'Medium',
        status: task.status || 'Pending',
      });
    } else {
      setEditingId(null);
      setFormData({
        ...emptyForm,
        assigned_to_user_id: user?.id || '',
      });
    }

    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      ...emptyForm,
      assigned_to_user_id: user?.id || '',
    });
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
        title: formData.title,
        description: formData.description || null,
        client_id: formData.client_id ? Number(formData.client_id) : null,
        due_date: formData.due_date || null,
        priority: formData.priority,
        status: formData.status,
      };

      if (['Super Admin', 'Admin', 'HR'].includes(user?.role)) {
        payload.assigned_to_user_id = formData.assigned_to_user_id
          ? Number(formData.assigned_to_user_id)
          : user?.id;
      }

      if (editingId) {
        await client.put(`/crm/tasks/${editingId}`, payload);
      } else {
        await client.post('/crm/tasks', payload);
      }

      await fetchTasks();
      closeModal();
    } catch (error) {
      console.error('Failed to save task:', error);
      setFormError(error.response?.data?.message || 'Unable to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (task) => {
    const confirmed = window.confirm(`Delete task "${task.title}"?`);
    if (!confirmed) return;

    try {
      await client.delete(`/crm/tasks/${task.id}`);
      await fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert(error.response?.data?.message || 'Could not delete task.');
    }
  };

  const columns = useMemo(
    () => [
      { header: 'Title', accessor: 'title' },
      {
        header: 'Client',
        accessor: 'client_name',
        render: (row) => row.client_name || 'No client',
      },
      {
        header: 'Assignee',
        accessor: 'assigned_to_name',
        render: (row) => row.assigned_to_name || 'Unassigned',
      },
      {
  header: 'Due Date',
  accessor: 'due_date',
  render: (row) =>
    row.due_date
      ? new Date(row.due_date).toLocaleDateString('en-GB')
      : '—',
},
      {
        header: 'Priority',
        accessor: 'priority',
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              row.priority === 'High'
                ? 'bg-red-50 text-red-700'
                : row.priority === 'Medium'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {row.priority}
          </span>
        ),
      },
      {
        header: 'Status',
        accessor: 'status',
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              row.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {row.status}
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
              className="text-sm font-medium text-brand-primary hover:text-indigo-800"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row)}
              className="text-sm font-medium text-slate-400 hover:text-red-600"
            >
              Delete
            </button>
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
          <h2 className="text-2xl font-bold text-slate-900">Task Board</h2>
          <p className="mt-1 text-sm text-slate-500">Track follow-ups, assignments, and due dates.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          + New Task
        </button>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <DataTable
            columns={columns}
            data={tasks}
            searchField="title"
            filterField="status"
            filterOptions={['Pending', 'Completed']}
          />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              {editingId ? 'Edit Task' : 'Create Task'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Title
                  </label>
                  <input
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Client
                  </label>
                  <select
                    name="client_id"
                    value={formData.client_id}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">No client</option>
                    {clients.map((clientItem) => (
                      <option key={clientItem.id} value={clientItem.id}>
                        {clientItem.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                {['Super Admin', 'Admin', 'HR'].includes(user?.role) && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Assignee
                    </label>
                    <select
                      name="assigned_to_user_id"
                      value={formData.assigned_to_user_id}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">Select assignee</option>
                      {users.map((userItem) => (
                        <option key={userItem.user_id || userItem.id} value={userItem.user_id || userItem.id}>
                          {userItem.name} ({userItem.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;

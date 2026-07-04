import React, { useState, useEffect } from 'react';
import client from '../api/client';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({ clients: 0, positions: 0, tasksToday: 0 });
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchDashboardStats = async () => {
      try {
        setFailed(false);
        const [summaryRes, tasksRes, logsRes] = await Promise.all([
          client.get('/crm/analytics/summary', { signal }),
          client.get('/crm/tasks/due-today', { signal }),
          client.get('/crm/activities?limit=5', { signal })
        ]);

        // Defensive state setting
        setMetrics({
          clients: Number(summaryRes?.data?.data?.totalClients ?? 0),
          positions: Number(summaryRes?.data?.data?.openPositions ?? 0),
          tasksToday: Number(summaryRes?.data?.data?.tasksDueToday ?? 0)
        });
        
        const tasksPayload = tasksRes?.data?.data ?? tasksRes?.data;
        setTasks(Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : []);
        setActivities(Array.isArray(logsRes?.data?.data) ? logsRes.data.data : []);
      } catch (error) {
        if (error.name !== 'CanceledError') {
          console.error("Dashboard metric resolution failure:", error);
          setFailed(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
    return () => abortController.abort();
  }, []);

  // Safe formatting utility
  const formatNumber = (val) => Number(val ?? 0).toLocaleString();

  // ... (exportTasksToCSV remains the same)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm font-medium tracking-wide">
        Resolving system analytics state context...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Clients Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Account Clients</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatNumber(metrics.clients)}</h3>
          </div>
        </div>

        {/* Positions Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Open Positions</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{formatNumber(metrics.positions)}</h3>
          </div>
        </div>

        {/* Tasks Today Card */}
        <div className="bg-white p-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Follow-ups Due Today</p>
            <h3 className="text-3xl font-black text-brand-primary mt-1">{formatNumber(metrics.tasksToday)}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-ups Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Today's Follow-ups</h2>
          </div>

          {failed ? (
            <div className="px-6 py-8 text-sm font-medium text-red-600">
              Unable to load tasks
            </div>
          ) : tasks.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">
              No follow-ups due today.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <li key={task.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      {task.client_name || 'No client linked'} · {task.assigned_to_name || 'Unassigned'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand-primary">{task.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent System Activity Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Recent System Activity (Audit Logs)</h2>
          </div>

          {failed ? (
            <div className="px-6 py-8 text-sm font-medium text-red-600">
              Unable to load activity logs
            </div>
          ) : activities.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">
              No recent logs recorded.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activities.map((activity) => (
                <li key={activity.id} className="px-6 py-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {activity.action_type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 font-medium">{activity.description}</p>
                  <p className="text-xs text-slate-500">
                    Performed by: <span className="font-semibold text-slate-600">{activity.user_name || 'System / Unlinked'}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

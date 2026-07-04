import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/ClientsPage';
import EmployeesPage from './pages/EmployeesPage';
import RecruitersPage from './pages/RecruitersPage';
import PositionsPage from './pages/PositionsPage';
import TasksPage from './pages/TasksPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Access Entry Node */}
          <Route path="/login" element={<Login />} />

          {/* Secure Administrative App Interface Context */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route 
              path="clients" 
              element={
                <ProtectedRoute allowedRoles={['Super Admin', 'Admin', 'HR', 'Sales Executive']}>
                  <ClientsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="employees" 
              element={
                <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                  <EmployeesPage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="recruiters"
              element={
                <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                  <RecruitersPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="positions" 
              element={
                <ProtectedRoute allowedRoles={['Super Admin', 'Admin', 'HR', 'Recruiter']}>
                  <PositionsPage />
                </ProtectedRoute>
              } 
            />
            <Route path="tasks" element={<TasksPage />} />
          </Route>

          {/* Global Catch-all Catchment Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

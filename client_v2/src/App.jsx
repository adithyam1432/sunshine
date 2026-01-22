import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Distribute from './pages/Distribute';
import AddInventory from './pages/AddInventory';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import ErrorBoundary from './components/ErrorBoundary';
import { DatabaseProvider } from './db/DatabaseContext';

const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <DatabaseProvider>
      <HashRouter>
        <div style={{ paddingBottom: '70px' }}> {/* Space for Bottom Nav */}
          <Navbar />
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/distribute" element={
                <ProtectedRoute>
                  <Distribute />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/add-inventory" element={
                <ProtectedRoute>
                  <AddInventory />
                </ProtectedRoute>
              } />
            </Routes>
          </ErrorBoundary>
          <BottomNav />
        </div>
      </HashRouter>
    </DatabaseProvider>
  );
}

export default App;

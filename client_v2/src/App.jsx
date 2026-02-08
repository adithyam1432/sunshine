import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
  const lastLogin = localStorage.getItem('last_login_date');
  const today = new Date().toDateString();

  if (!user || lastLogin !== today) {
    localStorage.removeItem('user');
    localStorage.removeItem('last_login_date');
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Layout Component to handle conditional styling
const MainLayout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div style={isLoginPage ? {} : { paddingBottom: '70px' }}>
      {!isLoginPage && <Navbar />}
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
      {!isLoginPage && <BottomNav />}
    </div>
  );
};

function App() {
  return (
    <DatabaseProvider>
      <HashRouter>
        <MainLayout />
      </HashRouter>
    </DatabaseProvider>
  );
}

export default App;

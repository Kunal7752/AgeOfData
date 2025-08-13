// src/App.jsx
import React, { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';

import Layout from './components/Layout/Layout';
import HomePage               from './pages/HomePage';
import MatchesPage            from './pages/MatchesPage';
import PlayersPage            from './pages/PlayersPage';
import CivilizationsPage      from './pages/CivilizationsPage';
import CivilizationDetailPage from './pages/CivilizationDetailPage';
import MapsPage               from './pages/MapsPage';
import LeaderboardsPage       from './pages/LeaderboardsPage';

function App() {
  // Theme state & persistence
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);
  const handleThemeChange = newTheme => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Figure out current page from URL
  const location = useLocation();
  const navigate = useNavigate();
  const seg = location.pathname.split('/')[1] || 'civs';
  const currentPage = seg === 'civs' ? 'civilizations' : seg;

  // Map page IDs back to routes for nav buttons
  const pageRoutes = {
    home: '/home',
    matches: '/matches',
    players: '/players',
    civilizations: '/civs',
    maps: '/maps',
    leaderboards: '/leaderboards'
  };
  const setCurrentPage = page => {
    navigate(pageRoutes[page] || '/civs');
  };

  return (
    <div className="min-h-screen bg-base-100">
      <Layout
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        theme={theme}
        setTheme={handleThemeChange}
      >
        <Routes>
          {/* Redirect root to /civs */}
          <Route path="/" element={<Navigate to="/civs" replace />} />

          {/* Main pages */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/civs" element={<CivilizationsPage />} />
          <Route path="/civs/:civName" element={<CivilizationDetailPage />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/leaderboards" element={<LeaderboardsPage />} />

          {/* 404 */}
          <Route path="*" element={<h1 className="p-8">Page Not Found</h1>} />
        </Routes>
      </Layout>
    </div>
  );
}

export default App;

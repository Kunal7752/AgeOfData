import React, { useState, useEffect } from 'react';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import MatchesPage from './pages/MatchesPage';
import PlayersPage from './pages/PlayersPage';
import CivilizationsPage from './pages/CivilizationsPage';
import MapsPage from './pages/MapsPage';
import LeaderboardsPage from './pages/LeaderboardsPage';

// Page components mapping
const pages = {
  home: HomePage,
  matches: MatchesPage,
  players: PlayersPage,
  civilizations: CivilizationsPage,
  maps: MapsPage,
  leaderboards: LeaderboardsPage
};

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [theme, setTheme] = useState('dark');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Update theme
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Get current page component
  const CurrentPageComponent = pages[currentPage] || HomePage;

  return (
    <div className="min-h-screen bg-base-100">
      <Layout 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        theme={theme}
        setTheme={handleThemeChange}
      >
        <CurrentPageComponent />
      </Layout>
    </div>
  );
}

export default App;
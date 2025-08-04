import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children, currentPage, setCurrentPage, theme, setTheme }) => {
  return (
    <div className="drawer">
      <input id="drawer-toggle" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        <Navbar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          theme={theme}
          setTheme={setTheme}
        />
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
      
      {/* Mobile drawer */}
      <div className="drawer-side lg:hidden">
        <label htmlFor="drawer-toggle" className="drawer-overlay"></label>
        <aside className="w-64 min-h-full bg-base-200">
          <div className="p-4">
            <h2 className="text-lg font-bold text-primary mb-4">Navigation</h2>
            <ul className="menu space-y-2">
              <li>
                <button 
                  onClick={() => setCurrentPage('home')}
                  className={`${currentPage === 'home' ? 'active' : ''}`}
                >
                  <i className="fas fa-home mr-2"></i>
                  Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentPage('matches')}
                  className={`${currentPage === 'matches' ? 'active' : ''}`}
                >
                  <i className="fas fa-sword mr-2"></i>
                  Matches
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentPage('players')}
                  className={`${currentPage === 'players' ? 'active' : ''}`}
                >
                  <i className="fas fa-users mr-2"></i>
                  Players
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentPage('civilizations')}
                  className={`${currentPage === 'civilizations' ? 'active' : ''}`}
                >
                  <i className="fas fa-flag mr-2"></i>
                  Civilizations
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentPage('maps')}
                  className={`${currentPage === 'maps' ? 'active' : ''}`}
                >
                  <i className="fas fa-map mr-2"></i>
                  Maps
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentPage('leaderboards')}
                  className={`${currentPage === 'leaderboards' ? 'active' : ''}`}
                >
                  <i className="fas fa-trophy mr-2"></i>
                  Leaderboards
                </button>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Layout;
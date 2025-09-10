import React from 'react';

const Navbar = ({ currentPage, setCurrentPage, theme, setTheme }) => {
  const themes = [
    { name: 'dark', label: 'Dark', icon: 'fas fa-moon' },
    { name: 'light', label: 'Light', icon: 'fas fa-sun' },
    { name: 'cyberpunk', label: 'Cyberpunk', icon: 'fas fa-robot' },
    { name: 'synthwave', label: 'Synthwave', icon: 'fas fa-wave-square' },
    { name: 'forest', label: 'Forest', icon: 'fas fa-tree' },
    { name: 'aqua', label: 'Aqua', icon: 'fas fa-water' }
  ];

  // Simplified navigation - only Home, Civilizations, Maps, Insights
  const navItems = [
    { id: 'home', label: 'Home', icon: 'fas fa-home' },
    { id: 'civilizations', label: 'Civilizations', icon: 'fas fa-flag' },
    { id: 'maps', label: 'Maps', icon: 'fas fa-map' },
    { id: 'insights', label: 'Insights', icon: 'fas fa-chart-bar' }
  ];

  return (
    <div className="navbar bg-base-200 shadow-lg border-b border-base-300">
      <div className="navbar-start">
        <label htmlFor="drawer-toggle" className="btn btn-square btn-ghost lg:hidden">
          <i className="fas fa-bars text-xl"></i>
        </label>
        <button 
          onClick={() => setCurrentPage('home')}
          className="btn btn-ghost text-xl font-bold text-primary hover:text-primary-focus"
        >
          <i className="fas fa-crown mr-2 text-primary"></i>
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AoE Stats
          </span>
        </button>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 space-x-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setCurrentPage(item.id)}
                className={`btn btn-ghost btn-sm ${
                  currentPage === item.id 
                    ? 'bg-primary text-primary-content hover:bg-primary-focus' 
                    : 'hover:bg-base-300'
                }`}
              >
                <i className={`${item.icon} mr-2`}></i>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="navbar-end space-x-2">
        {/* Theme selector only */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <i className="fas fa-palette text-lg"></i>
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300">
            <li className="menu-title">
              <span className="text-base-content/70">Choose Theme</span>
            </li>
            {themes.map((themeOption) => (
              <li key={themeOption.name}>
                <button
                  onClick={() => setTheme(themeOption.name)}
                  className={`${theme === themeOption.name ? 'active' : ''}`}
                >
                  <i className={`${themeOption.icon} mr-2`}></i>
                  {themeOption.label}
                  {theme === themeOption.name && (
                    <i className="fas fa-check ml-auto text-primary"></i>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
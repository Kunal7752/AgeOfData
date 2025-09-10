// utils/formatters.js - FINAL FIXED VERSION matching backend duration detection
export const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  return new Intl.NumberFormat().format(num);
};

export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
};

// FIXED: Use exact same logic as backend stats.js convertDurationToMinutes function
export const formatDuration = (durationValue) => {
  if (!durationValue || durationValue <= 0) return 'N/A';

  let minutes;

  // Detect format based on magnitude - EXACT backend logic
  if (durationValue > 100000000) {
    // Nanoseconds (very large numbers)
    minutes = Math.round(durationValue / 60000000000);
  } else if (durationValue > 100000) {
    // Milliseconds  
    minutes = Math.round(durationValue / 60000);
  } else if (durationValue > 1000) {
    // Seconds
    minutes = Math.round(durationValue / 60);
  } else {
    // Already in minutes
    minutes = Math.round(durationValue);
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const now = new Date();
  const target = new Date(date);
  const diffInSeconds = Math.floor((now - target) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(date);
};

export const formatElo = (elo) => {
  if (elo === null || elo === undefined) return 'Unrated';
  return Math.round(elo).toLocaleString();
};

export const getEloColor = (elo) => {
  if (!elo) return 'text-base-content';
  if (elo < 1000) return 'text-error';
  if (elo < 1200) return 'text-warning';
  if (elo < 1400) return 'text-success';
  if (elo < 1600) return 'text-info';
  if (elo < 1800) return 'text-secondary';
  return 'text-primary';
};

export const getEloRank = (elo) => {
  if (!elo) return 'Unrated';
  if (elo < 800) return 'Bronze';
  if (elo < 1000) return 'Silver';
  if (elo < 1200) return 'Gold';
  if (elo < 1400) return 'Platinum';
  if (elo < 1600) return 'Diamond';
  if (elo < 1800) return 'Master';
  if (elo < 2000) return 'Grandmaster';
  return 'Champion';
};

export const formatCivilization = (civ) => {
  if (!civ) return 'Unknown';
  
  // Capitalize first letter and handle special cases
  const civMap = {
    'aztecs': 'Aztecs',
    'berbers': 'Berbers',
    'britons': 'Britons',
    'bulgarians': 'Bulgarians',
    'burmese': 'Burmese',
    'byzantines': 'Byzantines',
    'celts': 'Celts',
    'chinese': 'Chinese',
    'cumans': 'Cumans',
    'ethiopians': 'Ethiopians',
    'franks': 'Franks',
    'goths': 'Goths',
    'huns': 'Huns',
    'incas': 'Incas',
    'indians': 'Indians',
    'italians': 'Italians',
    'japanese': 'Japanese',
    'khmer': 'Khmer',
    'koreans': 'Koreans',
    'lithuanians': 'Lithuanians',
    'magyars': 'Magyars',
    'malay': 'Malay',
    'malians': 'Malians',
    'mayans': 'Mayans',
    'mongols': 'Mongols',
    'persians': 'Persians',
    'portuguese': 'Portuguese',
    'saracens': 'Saracens',
    'slavs': 'Slavs',
    'spanish': 'Spanish',
    'tatars': 'Tatars',
    'teutons': 'Teutons',
    'turks': 'Turks',
    'vietnamese': 'Vietnamese',
    'vikings': 'Vikings'
  };
  
  return civMap[civ.toLowerCase()] || civ.charAt(0).toUpperCase() + civ.slice(1);
};

export const formatMap = (map) => {
  if (!map) return 'Unknown';
  
  // Handle special map names
  const mapNames = {
    'arabia': 'Arabia',
    'arena': 'Arena',
    'black_forest': 'Black Forest',
    'gold_rush': 'Gold Rush',
    'hideout': 'Hideout',
    'islands': 'Islands',
    'nomad': 'Nomad',
    'rivers': 'Rivers',
    'team_islands': 'Team Islands'
  };
  
  return mapNames[map.toLowerCase()] || map.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getWinRateColor = (winRate) => {
  if (winRate >= 0.6) return 'text-success';
  if (winRate >= 0.5) return 'text-warning';
  return 'text-error';
};

export const formatGameType = (gameType) => {
  const gameTypes = {
    'random_map': 'Random Map',
    'regicide': 'Regicide',
    'death_match': 'Death Match',
    'wonder_race': 'Wonder Race',
    'defend_wonder': 'Defend Wonder',
    'king_of_hill': 'King of the Hill',
    'battle_royale': 'Battle Royale'
  };
  
  return gameTypes[gameType] || gameType;
};

export const formatLeaderboard = (leaderboard) => {
  const leaderboards = {
    '1': 'Unranked',
    '2': '1v1 Random Map',
    '3': 'Team Random Map',
    '4': '1v1 Death Match',
    '13': '1v1 Empire Wars',
    '14': 'Team Empire Wars'
  };
  
  return leaderboards[leaderboard] || `Leaderboard ${leaderboard}`;
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
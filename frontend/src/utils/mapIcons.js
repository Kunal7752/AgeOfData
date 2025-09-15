// utils/mapIcons.js - Map icon utilities similar to civilizationIcons.js

const mapIcons = {
  'arabia': '/images/maps/arabia.webp',
  'arena': '/images/maps/arena.webp',
  'black_forest': '/images/maps/black_forest.webp',
  'islands': '/images/maps/islands.webp',
  'nomad': '/images/maps/nomad.webp',
  'fortress': '/images/maps/fortress.webp',
  'highland': '/images/maps/highland.webp',
  'continental': '/images/maps/continental.webp',
  'mediterranean': '/images/maps/mediterranean.webp',
  'baltic': '/images/maps/baltic.webp',
  'coastal': '/images/maps/coastal.webp',
  'team islands': '/images/maps/teamislands.webp',
  'gold_rush': '/images/maps/gold_rush.webp',
  'oasis': '/images/maps/oasis.webp',
  'yucatan': '/images/maps/yucatan.webp',
  'salt marsh': '/images/maps/saltmarsh.webp',
  'crater_lake': '/images/maps/crater_lake.webp',
  'rivers': '/images/maps/rivers.webp',
  'migration': '/images/maps/migration.webp',
  'team moats': '/images/maps/teammoats.webp',
  'full random': '/images/maps/fullrandom.webp',
  'blind random': '/images/maps/blindrandom.webp',
  'acropolis': '/images/maps/acropolis.webp',
  'budapest': '/images/maps/budapest.webp',
  'cenotes': '/images/maps/cenotes.webp',
  'city of lakes': '/images/maps/cityoflakes.webp',
  'golden pit': '/images/maps/goldenpit.webp',
  'hill_fort': '/images/maps/hill_fort.webp',
  'lombardia': '/images/maps/lombardia.webp',
  'steppe': '/images/maps/steppe.webp',
  'valley': '/images/maps/valley.webp',
  'megandom': '/images/maps/megandom.webp',
  'serengeti': '/images/maps/serengeti.webp',
  'socotra': '/images/maps/socotra.webp',
  'alpine lakes': '/images/maps/alpinelakes.webp',
  'bog islands': '/images/maps/bogislands.webp',
  'mountain range': '/images/maps/mountainrange.webp',
  'ravines': '/images/maps/ravines.webp',
  'wolf hill': '/images/maps/wolfhill.webp',
  'enclosed': '/images/maps/enclosed.webp',
  'haboob': '/images/maps/haboob.webp',
  'kawasan': '/images/maps/kawasan.webp',
  'land nomad': '/images/maps/landnomad.webp',
  'marketplace': '/images/maps/marketplace.webp',
  'meadow': '/images/maps/meadow.webp',
  'sacred springs': '/images/maps/sacredsprings.webp',
  'sandbank': '/images/maps/sandbank.webp',
  'scandinavia': '/images/maps/scandinavia.webp',
  'four_lakes': '/images/maps/four_lakes.webp',
  'african_clearing': '/images/maps/african_clearing.webp',
  'aftermath': '/images/maps/aftermath.webp',
  'amazon tunnel': '/images/maps/amazontunnel.webp',
  'archipelago': '/images/maps/archipelago.webp',
  'atacama': '/images/maps/atacama.webp',
  'bog': '/images/maps/bog.webp',
  'burial grounds': '/images/maps/burialgrounds.webp',
  'cross': '/images/maps/cross.webp',
  'earth': '/images/maps/earth.webp',
  'far out': '/images/maps/farout.webp',
  'ghost lake': '/images/maps/ghostlake.webp',
  'golden_swamp': '/images/maps/golden_swamp.webp',
  'greenland': '/images/maps/greenland.webp',
  'hamburger': '/images/maps/hamburger.webp',
  'holy line': '/images/maps/holyline.webp',
  'iberia': '/images/maps/iberia.webp',
  'india': '/images/maps/india.webp',
  'inner circle': '/images/maps/innercircle.webp',
  'kilimanjaro': '/images/maps/kilimanjaro.webp',
  'king of the hill': '/images/maps/kingofthehill.webp',
  'michi': '/images/maps/michi.webp',
  'mongolia': '/images/maps/mongolia.webp',
  'nile_delta': '/images/maps/nile_delta.webp',
  'pacific islands': '/images/maps/pacificislands.webp',
  'ring fortress': '/images/maps/ringfortress.webp',
  'runestones': '/images/maps/runestones.webp',
  'snakepit': '/images/maps/snakepit.webp',
  'team glaciers': '/images/maps/teamglaciers.webp',
  'texas': '/images/maps/texas.webp',
  'the unknown': '/images/maps/theunknown.webp',
  'wade': '/images/maps/wade.webp',
  'warring islands': '/images/maps/warringislands.webp',
  'water nomad': '/images/maps/waternomad.webp',
  'lowland': '/images/maps/lowland.webp',
  'glade': '/images/maps/Rm_glade.webp',
  'ring_fortress': '/images/maps/Rm_ring_fortress.webp',
  'hideout': '/images/maps/hideout.webp',
  'fortified_clearing': '/images/maps/fortified_clearing.webp',
  'megarandom': '/images/maps/megarandom.webp',
  'passage': '/images/maps/passage.webp',
  'shoals': '/images/maps/shoals.webp',
  'islands': '/images/maps/islands.webp',
  'Black forest': '/images/maps/black_forest.webp',
  'graveyards': '/images/maps/graveyards.webp',
  'sherwood_forest': '/images/maps/sherwood_forest.webp',
  'oasis': '/images/maps/oasis.webp', 
  'team_glaciers': '/images/maps/team_glaciers.webp',
};

// Get map icon URL
export const getMapIcon = (mapName) => {
  if (!mapName) return null;
  
  const normalizedName = mapName.toLowerCase().trim();
  return mapIcons[normalizedName] || null;
};

// Check if map has an icon
export const hasMapIcon = (mapName) => {
  if (!mapName) return false;
  const normalizedName = mapName.toLowerCase().trim();
  return mapIcons.hasOwnProperty(normalizedName);
};

// Get all available map icons
export const getAllMapIcons = () => mapIcons;

// Get map names that have icons
export const getMapsWithIcons = () => Object.keys(mapIcons);

// Format map name for display
export const formatMapName = (mapName) => {
  if (!mapName) return 'Unknown Map';
  
  return mapName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Fallback icon for unknown maps
export const FALLBACK_MAP_ICON = '/images/maps/unknown.webp';

export default mapIcons;
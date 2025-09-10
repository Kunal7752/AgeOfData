const civIcons = {
  'aztecs': '/images/civs/aztecs.webp',
  'berbers': '/images/civs/berbers.webp', 
  'britons': '/images/civs/britons.webp',
  'bulgarians': '/images/civs/bulgarians.webp',
  'burmese': '/images/civs/burmese.webp',
  'byzantines': '/images/civs/byzantines.webp',
  'celts': '/images/civs/celts.webp',
  'chinese': '/images/civs/chinese.webp',
  'cumans': '/images/civs/cumans.webp',
  'ethiopians': '/images/civs/ethiopians.webp',
  'franks': '/images/civs/franks.webp',
  'goths': '/images/civs/goths.webp',
  'hindustanis': '/images/civs/hindustanis.webp', // ADDED
  'huns': '/images/civs/huns.webp',
  'incas': '/images/civs/incas.webp',
  'indians': '/images/civs/indians.webp',
  'italians': '/images/civs/italians.webp',
  'japanese': '/images/civs/japanese.webp',
  'khitans': '/images/civs/khitans.webp', // ADDED
  'khmer': '/images/civs/khmer.webp',
  'koreans': '/images/civs/koreans.webp',
  'lithuanians': '/images/civs/lithuanians.webp',
  'magyars': '/images/civs/magyars.webp',
  'malay': '/images/civs/malay.webp',
  'malians': '/images/civs/malians.webp',
  'mayans': '/images/civs/mayans.webp',
  'mongols': '/images/civs/mongols.webp',
  'persians': '/images/civs/persians.webp',
  'poles': '/images/civs/poles.webp', // ADDED
  'portuguese': '/images/civs/portuguese.webp',
  'romans': '/images/civs/romans.webp', // ADDED
  'saracens': '/images/civs/saracens.webp',
  'shu': '/images/civs/shu.webp', // ADDED
  'sicilians': '/images/civs/sicilians.webp', // ADDED
  'slavs': '/images/civs/slavs.webp',
  'spanish': '/images/civs/spanish.webp',
  'tatars': '/images/civs/tatars.webp',
  'teutons': '/images/civs/teutons.webp',
  'turks': '/images/civs/turks.webp',
  'vietnamese': '/images/civs/vietnamese.webp',
  'vikings': '/images/civs/vikings.webp',
  'wu': '/images/civs/wu.webp',
  'dravidians': '/images/civs/dravidians.webp',
  'armenians': '/images/civs/armenians.webp',
  'bohemians': '/images/civs/bohemians.webp',
  'jurchens': '/images/civs/jurchens.webp',
  'bengalis': '/images/civs/bengalis.webp',
  'burgundians': '/images/civs/burgundians.webp',
  'georgians': '/images/civs/georgians.webp',
  'wei': '/images/civs/wei.webp',
  'gurjaras': '/images/civs/gurjaras.webp' // ADDED
};

// Get civilization icon URL
export const getCivIcon = (civName) => {
  if (!civName) return null;
  
  const normalizedName = civName.toLowerCase().trim();
  return civIcons[normalizedName] || null;
};

// Check if civilization has an icon
export const hasCivIcon = (civName) => {
  if (!civName) return false;
  const normalizedName = civName.toLowerCase().trim();
  return civIcons.hasOwnProperty(normalizedName);
};

// Get all available civilization icons
export const getAllCivIcons = () => civIcons;

// Get civilization names that have icons
export const getCivsWithIcons = () => Object.keys(civIcons);

// Fallback icon for unknown civilizations
export const FALLBACK_CIV_ICON = '/images/civs/unknown.webp';

export default civIcons;
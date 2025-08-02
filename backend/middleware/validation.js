const validateProfileId = (req, res, next) => {
  const { profileId } = req.params;
  
  if (!profileId || isNaN(profileId)) {
    return res.status(400).json({ error: 'Invalid profile ID' });
  }
  
  next();
};

const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(page) || page < 1)) {
    return res.status(400).json({ error: 'Invalid page number' });
  }
  
  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    return res.status(400).json({ error: 'Invalid limit (must be 1-100)' });
  }
  
  next();
};

const validateGameId = (req, res, next) => {
  const { gameId } = req.params;
  
  if (!gameId || gameId.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid game ID' });
  }
  
  next();
};

module.exports = {
  validateProfileId,
  validatePagination,
  validateGameId
};
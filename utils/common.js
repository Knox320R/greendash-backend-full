const getCreatedDate = (obj) => {
  try {
    if (!obj) return null;
    
    // Handle different object structures
    if (obj.createdAt) return obj.createdAt;
    if (obj.created_at) return obj.created_at;
    if (obj.dataValues && obj.dataValues.createdAt) return obj.dataValues.createdAt;
    if (obj.dataValues && obj.dataValues.created_at) return obj.dataValues.created_at;
    
    return null;
  } catch (error) {
    console.error('Error getting created date:', error);
    return null;
  }
};

module.exports = {
  getCreatedDate
};


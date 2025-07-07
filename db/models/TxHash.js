'use strict';

module.exports = (sequelize, DataTypes) => {
  const TxHash = sequelize.define('TxHash', {
    tx_hash: {
      type: DataTypes.STRING(250),
    },
    amount: {
      type: DataTypes.STRING(50),
    },
    created_at: {
      type: DataTypes.DATE,
    }
  }, {
    tableName: 'txHashes',
    timestamps: false,
    underscored: true
  });

  return TxHash;
}; 
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TotalToken extends Model {}

  TotalToken.init({
    title: {
      type: DataTypes.ENUM(
        'seed_sale', 'private_sale', 'public_sale', 'airdrop',
        'liquidity', 'development', 'marketing & expansion',
        'team & audits', 'staking & reserves', 'others'
      ),
      allowNull: false,
      defaultValue: 'seed_sale'
    },
    description: {
      type: DataTypes.TEXT
    },
    percent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.0
    }
  }, {
    sequelize,
    modelName: 'TotalToken',
    tableName: 'total_tokens',
    timestamps: true,
    underscored: true
  });

  return TotalToken;
};

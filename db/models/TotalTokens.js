'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TotalToken extends Model { }

  TotalToken.init({
    title: {
      type: DataTypes.ENUM('seed_sale', 'private_sale', 'public_sale', 'airdrop', 'liquidity', 'development', 'marketing & expansion', 'team & audits', 'staking & reserves', 'total_staking_pool', 'daily_staking_pool', 'purchase_pool', 'other'),
      allowNull: false,
      defaultValue: 'seed_sale'
    },
    description: {
      type: DataTypes.TEXT
    },
    amount: {
      type: DataTypes.DECIMAL(20, 8).UNSIGNED,
      defaultValue: 0,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT.UNSIGNED,
      allowNull: true
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

'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RankPlan extends Model { }

  RankPlan.init({
    rank: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true
    },
    bonus_amount: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      comment: 'Bonus amount = 5% of volume for that rank'
    },
    volume: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    equivalent: {
      type: DataTypes.STRING(250),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'RankPlan',
    tableName: 'rank_plans',
    timestamps: true,
    underscored: true
  });

  return RankPlan;
};

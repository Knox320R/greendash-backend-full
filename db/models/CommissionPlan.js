'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CommissionPlan extends Model {}

  CommissionPlan.init({
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    commission_percent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'CommissionPlan',
    tableName: 'commission_plans',
    timestamps: true,
    underscored: true
  });

  return CommissionPlan;
};

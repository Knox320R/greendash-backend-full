'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminSetting extends Model {}

  AdminSetting.init({
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'token_price',
      unique: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    value: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'AdminSetting',
    tableName: 'admin_settings',
    timestamps: true,
    underscored: true
  });

  return AdminSetting;
};

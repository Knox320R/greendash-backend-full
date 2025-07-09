'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Staking extends Model {
    static associate(models) {
      Staking.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      Staking.belongsTo(models.StakingPackage, { foreignKey: 'package_id', as: 'package' });
    }
  }

  Staking.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'staking_packages', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'cancelled', 'paused'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'Staking',
    tableName: 'stakings',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['package_id'] },
      { fields: ['status'] },
    ]
  });

  return Staking;
}; 
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('token_pools', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      title: {
        type: Sequelize.ENUM('total_staking', 'daily_staking', 'platform_fee', 'purchase', 'other'),
        allowNull: false,
        defaultValue: 'total_staking'
      },
      description: {
        type: Sequelize.TEXT,
      },
      amount: {
        type: Sequelize.DECIMAL(20, 8).UNSIGNED,
        defaultValue: 0,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('token_pools');
  }
}; 
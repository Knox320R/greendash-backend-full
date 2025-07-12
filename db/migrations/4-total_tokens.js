'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('total_tokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      title: {
        type: Sequelize.ENUM('seed_sale', 'private_sale', 'public_sale', 'airdrop', 'liquidity', 'development', 'marketing & expansion', 'team & audits', 'staking & reserves', 'total_staking_pool', 'daily_staking_pool', 'purchase_pool', 'other'),
        allowNull: false,
        defaultValue: 'seed_sale'
      },
      description: {
        type: Sequelize.TEXT,
      },
      amount: {
        type: Sequelize.DECIMAL(20, 8).UNSIGNED,
        defaultValue: 0,
        allowNull: false,
      },
      price: {
        type: Sequelize.FLOAT.UNSIGNED,
        defaultValue: 0.01,
        allowNull: true
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
    await queryInterface.dropTable('total_tokens');
  }
}; 
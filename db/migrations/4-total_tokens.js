'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('total_tokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.ENUM('seed_sale', 'private_sale', 'public_sale', 'airdrop', 'liquidity', 'development', 'marketing & expansion', 'team & audits', 'staking & reserves', 'others'),
        allowNull: false,
        defaultValue: 'seed_sale'
      },
      description: {
        type: Sequelize.TEXT,
      },
      percent: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 2.0
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
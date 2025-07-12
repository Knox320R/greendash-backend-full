'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('commission_plans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      level: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        comment: 'Referral level (1-9)'
      },
      commission_percent: {
        type: Sequelize.FLOAT.UNSIGNED,
        allowNull: false,
        comment: 'Commission percentage for this level'
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
    await queryInterface.dropTable('commission_plans');
  }
};

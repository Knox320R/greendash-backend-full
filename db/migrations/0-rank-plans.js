'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('rank_plans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      rank: {
        type: Sequelize.STRING(250),
        allowNull: false,
        unique: true,
        comment: 'Rank name, e.g. Bronze, Silver, Gold'
      },
      volume: {
        type: Sequelize.DECIMAL(20, 2).UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: 'Minimum weaker leg volume required'
      },
      bonus_amount: {
        type: Sequelize.DECIMAL(20, 2).UNSIGNED,
        allowNull: false,
        comment: 'Bonus amount = 5% of volume for that rank'
      },
      equivalent: {
        type: Sequelize.STRING(250),
        allowNull: true,
        comment: 'Optional electric vehicle reward'
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
    await queryInterface.dropTable('rank_plans');
  }
};

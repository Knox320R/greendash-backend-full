'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('transactions', [
      {
        user_id: 1,
        type: 'staking',
        amount: 10000,
      },
      {
        user_id: 2,
        type: 'staking',
        amount: 50000,
      },
      {
        user_id: 1,
        type: 'withdrawal',
        amount: 100,
      },
      {
        user_id: 4,
        type: 'weak_leg_bonus',
        amount: 500,
      },
      {
        user_id: 1,
        type: 'daily_reward',
        amount: 120,
      },
      {
        user_id: 1,
        type: 'withdrawal',
        amount: 200,
      },
      {
        user_id: 7,
        type: 'staking',
        amount: 50000,
      },
      {
        user_id: 7,
        type: 'daily_reward',
        amount: 750,
      },
      {
        user_id: 9,
        type: 'staking',
        amount: 50000,
      },
      {
        user_id: 1,
        type: 'withdrawal',
        amount: 250,
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('transactions', null, {});
  }
}; 
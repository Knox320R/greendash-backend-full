'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('transactions', [
      {
        user_id: 1,
        type: 'staking',
        amount: 10000,
        created_at: "2025-07-08 03:01:47"
      },
      {
        user_id: 2,
        type: 'staking',
        amount: 50000,
        created_at: "2025-06-12 03:01:47"
      },
      {
        user_id: 1,
        type: 'withdrawal',
        amount: 100,
        created_at: "2025-06-21 03:01:47"
      },
      {
        user_id: 4,
        type: 'weak_leg_bonus',
        amount: 500,
        created_at: "2025-07-08 03:01:47"
      },
      {
        user_id: 1,
        type: 'daily_reward',
        amount: 120,
        created_at: "2025-04-28 03:01:47"
      },
      {
        user_id: 1,
        type: 'withdrawal',
        amount: 200,
        created_at: "2025-06-18 03:01:47"
      },
      {
        user_id: 7,
        type: 'staking',
        amount: 50000,
        created_at: "2025-05-11 03:01:47"
      },
      {
        user_id: 7,
        type: 'daily_reward',
        amount: 750,
        created_at: "2025-05-24 03:01:47"
      },
      {
        user_id: 9,
        type: 'staking',
        amount: 50000,
        created_at: "2025-06-01 03:01:47"
      },
      {
        user_id: 1,
        type: 'withdrawal',
        amount: 250,
        created_at: "2025-04-14 03:01:47"
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('transactions', null, {});
  }
}; 
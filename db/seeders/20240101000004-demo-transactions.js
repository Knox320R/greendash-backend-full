'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('transactions', [
      {
        user_id: 1,
        type: 'staking',
        direction: 'in',
        amount: 10000,
        currency: 'EGD',
        status: 'completed',
        notes: 'Staking Daily Ride',
        created_at: new Date(Date.now() - 1000000),
        updated_at: new Date(Date.now() - 1000000)
      },
      {
        user_id: 2,
        type: 'staking',
        direction: 'in',
        amount: 5000,
        currency: 'EGD',
        status: 'completed',
        notes: 'Staking Weekly Pass',
        created_at: new Date(Date.now() - 2000000),
        updated_at: new Date(Date.now() - 2000000)
      },
      {
        user_id: 1,
        type: 'withdrawal',
        direction: 'out',
        amount: 100,
        currency: 'USDT',
        status: 'pending',
        notes: 'Withdrawal request',
        created_at: new Date(Date.now() - 3000000),
        updated_at: new Date(Date.now() - 3000000)
      },
      {
        user_id: 4,
        type: 'referral',
        direction: 'out',
        amount: 150,
        currency: 'USDT',
        status: 'completed',
        notes: 'Referral commission',
        created_at: new Date(Date.now() - 4000000),
        updated_at: new Date(Date.now() - 4000000)
      },
      {
        user_id: 1,
        type: 'staking',
        direction: 'in',
        amount: 1000,
        currency: 'EGD',
        status: 'completed',
        notes: 'Staking Personal EV',
        created_at: new Date(Date.now() - 5000000),
        updated_at: new Date(Date.now() - 5000000)
      },
      {
        user_id: 1,
        type: 'withdrawal',
        direction: 'out',
        amount: 200,
        currency: 'USDT',
        status: 'completed',
        notes: 'Withdrawal processed',
        created_at: new Date(Date.now() - 6000000),
        updated_at: new Date(Date.now() - 6000000)
      },
      {
        user_id: 7,
        type: 'staking',
        direction: 'in',
        amount: 30000,
        currency: 'EGD',
        status: 'pending',
        notes: 'Staking Corporate Mobility Hub',
        created_at: new Date(Date.now() - 7000000),
        updated_at: new Date(Date.now() - 7000000)
      },
      {
        user_id: 1,
        type: 'referral',
        direction: 'out',
        amount: 75,
        currency: 'USDT',
        status: 'completed',
        notes: 'Referral bonus',
        created_at: new Date(Date.now() - 8000000),
        updated_at: new Date(Date.now() - 8000000)
      },
      {
        user_id: 9,
        type: 'staking',
        direction: 'in',
        amount: 60000,
        currency: 'EGD',
        status: 'completed',
        notes: 'Staking Weekly Pass',
        created_at: new Date(Date.now() - 9000000),
        updated_at: new Date(Date.now() - 9000000)
      },
      {
        user_id: 1,
        type: 'withdrawal',
        direction: 'out',
        amount: 250,
        currency: 'USDT',
        status: 'pending',
        notes: 'Withdrawal request',
        created_at: new Date(Date.now() - 10000000),
        updated_at: new Date(Date.now() - 10000000)
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('transactions', null, {});
  }
}; 
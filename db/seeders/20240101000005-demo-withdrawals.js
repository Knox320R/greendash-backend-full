'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('withdrawals', [
      {
        user_id: 1,
        amount: 100,
        status: 'pending',
        created_at: new Date(Date.now() - 1000000),
        updated_at: new Date(Date.now() - 1000000)
      },
      {
        user_id: 2,
        amount: 200,
        status: 'pending',
        created_at: new Date(Date.now() - 2000000),
        updated_at: new Date(Date.now() - 2000000)
      },
      {
        user_id: 3,
        amount: 150,
        status: 'approved',
        created_at: new Date(Date.now() - 3000000),
        updated_at: new Date(Date.now() - 3000000)
      },
      {
        user_id: 4,
        amount: 300,
        status: 'completed',
        created_at: new Date(Date.now() - 4000000),
        updated_at: new Date(Date.now() - 4000000)
      },
      {
        user_id: 5,
        amount: 250,
        status: 'pending',
        created_at: new Date(Date.now() - 5000000),
        updated_at: new Date(Date.now() - 5000000)
      },
      {
        user_id: 6,
        amount: 400,
        status: 'completed',
        created_at: new Date(Date.now() - 6000000),
        updated_at: new Date(Date.now() - 6000000)
      },
      {
        user_id: 7,
        amount: 350,
        status: 'pending',
        created_at: new Date(Date.now() - 7000000),
        updated_at: new Date(Date.now() - 7000000)
      },
      {
        user_id: 8,
        amount: 500,
        status: 'completed',
        created_at: new Date(Date.now() - 8000000),
        updated_at: new Date(Date.now() - 8000000)
      },
      {
        user_id: 9,
        amount: 450,
        status: 'pending',
        created_at: new Date(Date.now() - 9000000),
        updated_at: new Date(Date.now() - 9000000)
      },
      {
        user_id: 10,
        amount: 600,
        status: 'rejected',
        created_at: new Date(Date.now() - 10000000),
        updated_at: new Date(Date.now() - 10000000)
      },
      {
        user_id: 1,
        amount: 100,
        status: 'completed',
        created_at: new Date(Date.now() - 1000000),
        updated_at: new Date(Date.now() - 1000000)
      },
      {
        user_id: 2,
        amount: 200,
        status: 'pending',
        created_at: new Date(Date.now() - 2000000),
        updated_at: new Date(Date.now() - 2000000)
      },
      {
        user_id: 3,
        amount: 150,
        status: 'pending',
        created_at: new Date(Date.now() - 3000000),
        updated_at: new Date(Date.now() - 3000000)
      },
      {
        user_id: 4,
        amount: 300,
        status: 'approved',
        created_at: new Date(Date.now() - 4000000),
        updated_at: new Date(Date.now() - 4000000)
      },
      {
        user_id: 5,
        amount: 250,
        status: 'pending',
        created_at: new Date(Date.now() - 5000000),
        updated_at: new Date(Date.now() - 5000000)
      },
      {
        user_id: 6,
        amount: 400,
        status: 'approved',
        created_at: new Date(Date.now() - 6000000),
        updated_at: new Date(Date.now() - 6000000)
      },
      {
        user_id: 7,
        amount: 350,
        status: 'pending',
        created_at: new Date(Date.now() - 7000000),
        updated_at: new Date(Date.now() - 7000000)
      },
      {
        user_id: 8,
        amount: 500,
        status: 'approved',
        created_at: new Date(Date.now() - 8000000),
        updated_at: new Date(Date.now() - 8000000)
      },
      {
        user_id: 9,
        amount: 450,
        status: 'rejected',
        created_at: new Date(Date.now() - 9000000),
        updated_at: new Date(Date.now() - 9000000)
      },
      {
        user_id: 10,
        amount: 600,
        status: 'pending',
        created_at: new Date(Date.now() - 10000000),
        updated_at: new Date(Date.now() - 10000000)
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('withdrawals', null, {});
  }
}; 
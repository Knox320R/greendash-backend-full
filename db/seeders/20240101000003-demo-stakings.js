'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('stakings', [
      {
        user_id: 1,
        package_id: 1,
        status: 'active',
        created_at: new Date(Date.now() - 8640000000),
        updated_at: new Date(Date.now() - 8640000000)
      },
      {
        user_id: 2,
        package_id: 2,
        status: 'active',
        created_at: new Date(Date.now() - 5000000000),
        updated_at: new Date(Date.now() - 5000000000)
      },
      {
        user_id: 1,
        package_id: 3,
        status: 'completed',
        created_at: new Date(Date.now() - 60000000000),
        updated_at: new Date(Date.now() - 60000000000)
      },
      {
        user_id: 2,
        package_id: 4,
        status: 'active',
        created_at: new Date(Date.now() - 4000000000),
        updated_at: new Date(Date.now() - 4000000000)
      },
      {
        user_id: 5,
        package_id: 5,
        status: 'completed',
        created_at: new Date(Date.now() - 50000000000),
        updated_at: new Date(Date.now() - 50000000000)
      },
      {
        user_id: 4,
        package_id: 6,
        status: 'active',
        created_at: new Date(Date.now() - 7000000000),
        updated_at: new Date(Date.now() - 7000000000)
      },
      {
        user_id: 7,
        package_id: 7,
        status: 'active',
        created_at: new Date(Date.now() - 10000000000),
        updated_at: new Date(Date.now() - 10000000000)
      },
      {
        user_id: 3,
        package_id: 1,
        status: 'completed',
        created_at: new Date(Date.now() - 80000000000),
        updated_at: new Date(Date.now() - 80000000000)
      },
      {
        user_id: 6,
        package_id: 2,
        status: 'active',
        created_at: new Date(Date.now() - 9000000000),
        updated_at: new Date(Date.now() - 9000000000)
      },
      {
        user_id: 10,
        package_id: 3,
        status: 'completed',
        created_at: new Date(Date.now() - 50000000000),
        updated_at: new Date(Date.now() - 50000000000)
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('stakings', null, {});
  }
}; 
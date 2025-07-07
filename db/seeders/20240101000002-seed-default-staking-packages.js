'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('staking_packages', [
      {
        name: 'Daily Ride',
        description: 'Entry-level package for daily users',
        stake_amount: 10000,
        daily_yield_percentage: 0.10,
        lock_period_days: 365,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Weekly Pass',
        description: 'Weekly investment package',
        stake_amount: 50000,
        daily_yield_percentage: 0.20,
        lock_period_days: 365,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Economy Car',
        description: 'Economy car staking package',
        stake_amount: 100000,
        daily_yield_percentage: 0.30,
        lock_period_days: 365,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Business Fleet',
        description: 'Business fleet package for advanced investors',
        stake_amount: 500000,
        daily_yield_percentage: 0.40,
        lock_period_days: 365,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Personal EV',
        description: 'Personal electric vehicle package',
        stake_amount: 1000000,
        daily_yield_percentage: 0.50,
        lock_period_days: 365,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Luxury Fleet',
        description: 'Luxury fleet package for premium investors',
        stake_amount: 5000000,
        daily_yield_percentage: 0.60,
        lock_period_days: 365,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Corporate Mobility Hub',
        description: 'Corporate mobility hub package for large-scale investors',
        stake_amount: 10000000,
        daily_yield_percentage: 0.70,
        lock_period_days: 365,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('staking_packages', null, {});
  }
}; 
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: true  // can be null if OAuth/social login planned
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      referred_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      parent_leg: {
        type: Sequelize.ENUM('left', 'right'),
        allowNull: false,
        defaultValue: 'left'
      },
      left_volume: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0
      },
      right_volume: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0
      },
      phone: {
        type: Sequelize.STRING(100),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      referral_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      wallet_address: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      egd_balance: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0
      },
      rank_goal: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
          model: 'rank_plans',
          key: 'id'
        },
        onDelete: "CASCADE",
        onUpdate: 'CASCADE',
      },
      withdrawals: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0
      },
      is_admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_email_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      email_verification_token: {
        type: Sequelize.STRING(250),
        allowNull: true
      },
      email_verification_expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      password_reset_token: {
        type: Sequelize.STRING(250)
      },
      password_reset_expires: {
        type: Sequelize.DATE
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

    // Indexes for fast lookup
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['referred_by']);
    await queryInterface.addIndex('users', ['referral_code']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};

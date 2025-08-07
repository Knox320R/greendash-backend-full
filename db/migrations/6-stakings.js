'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stakings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: "CASCADE",
        onUpdate: 'CASCADE',
      },
      package_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'staking_packages',
          key: 'id'
        },
        onDelete: "CASCADE",
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'cancelled', 'paused', 'free_staking'),
        allowNull: false,
        defaultValue: 'active'
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

    // Add indexes for better performance
    await queryInterface.addIndex('stakings', ['user_id']);
    await queryInterface.addIndex('stakings', ['package_id']);
    await queryInterface.addIndex('stakings', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stakings');
  }
}; 
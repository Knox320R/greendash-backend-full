'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Universal referral system
      User.belongsTo(models.User, { foreignKey: 'referred_by', as: 'referrer' });
      User.hasMany(models.User, { foreignKey: 'referred_by', as: 'referrals' });

      // Other associations
      User.hasMany(models.Transaction, { foreignKey: 'user_id' });
      User.hasMany(models.Staking, { foreignKey: 'user_id', as: 'stakings' });
      User.hasMany(models.Withdrawal, { foreignKey: 'user_id', as: 'withdrawal_requests' });

      // Staking package association
      User.hasMany(models.Staking, { foreignKey: 'user_id' });
      models.Staking.belongsTo(models.StakingPackage, { foreignKey: 'package_id' });
    }
  }

  User.init({
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    referred_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Universal referral system - who referred this user'
    },
    rank_goal: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      references: {
        model: 'rank_plans',
        key: 'id'
      },
      onDelete: "CASCADE",
      onUpdate: 'CASCADE',
    },
    parent_leg: {
      type: DataTypes.ENUM('left', 'right'),
      allowNull: false,
      defaultValue: 'left',
      comment: 'Which leg of the parent this user is on'
    },
    left_volume: {
      type: DataTypes.DECIMAL(20, 8).UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total volume in left leg'
    },
    right_volume: {
      type: DataTypes.DECIMAL(20, 8).UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total volume in right leg'
    },
    phone: {
      type: DataTypes.STRING(100),
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    wallet_address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    referral_code: {
      type: DataTypes.STRING(250),
      allowNull: false,
      unique: true
    },
    egd_balance: {
      type: DataTypes.DECIMAL(20, 8).UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    withdrawals: {
      type: DataTypes.DECIMAL(20, 8).UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_verification_token: {
      type: DataTypes.STRING(250),
      allowNull: true
    },
    email_verification_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    password_reset_token: {
      type: DataTypes.STRING(250),
      allowNull: true
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true
  });

  User.addHook('afterFind', (result) => {
    if (!result) return;
    const convert = (user) => {
      if (user && user.egd_balance !== undefined && user.egd_balance !== null) {
        user.egd_balance = Number(user.egd_balance);
      }
      if (user && user.withdrawals !== undefined && user.withdrawals !== null) {
        user.withdrawals = Number(user.withdrawals);
      }
      if (user && user.left_volume !== undefined && user.left_volume !== null) {
        user.left_volume = Number(user.left_volume);
      }
      if (user && user.right_volume !== undefined && user.right_volume !== null) {
        user.right_volume = Number(user.right_volume);
      }
    };
    if (Array.isArray(result)) {
      result.forEach(convert);
    } else {
      convert(result);
    }
  });

  // Password hashing hooks
  User.addHook('beforeCreate', async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });
  User.addHook('beforeUpdate', async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  // Password comparison method
  User.prototype.comparePassword = async function (plainPassword) {
    if (!this.password) return false;
    return bcrypt.compare(plainPassword, this.password);
  };

  // Binary network volume calculation methods
  User.prototype.getTotalVolume = function () {
    return Number(this.left_volume || 0) + Number(this.right_volume || 0);
  };

  User.prototype.getWeakerLeg = function () {
    const leftVol = Number(this.left_volume || 0);
    const rightVol = Number(this.right_volume || 0);
    return leftVol <= rightVol ? 'left' : 'right';
  };

  User.prototype.getStrongerLeg = function () {
    const leftVol = Number(this.left_volume || 0);
    const rightVol = Number(this.right_volume || 0);
    return leftVol >= rightVol ? 'left' : 'right';
  };

  User.prototype.getWeakerVolume = function () {
    const leftVol = Number(this.left_volume || 0);
    const rightVol = Number(this.right_volume || 0);
    return Math.min(leftVol, rightVol);
  };

  User.prototype.getStrongerVolume = function () {
    const leftVol = Number(this.left_volume || 0);
    const rightVol = Number(this.right_volume || 0);
    return Math.max(leftVol, rightVol);
  };

  return User;
};

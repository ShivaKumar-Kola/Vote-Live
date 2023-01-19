"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Admin.hasMany(models.Elections, {
        foreignKey: "AdminId",
        onDelete: "CASCADE",
      });
    }
  }
  Admin.init(
    {
      firstname: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
                msg: "firstname is required",
              },
              notEmpty: {
                msg: "firstname is required",
        },
      },
      lastname: {
        type: DataTypes.STRING,
      },
      email: {
        unique: true,
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Email is required",
          },
          notEmpty: {
            msg: "Email is required",
          },
          isEmail: {
            msg: "Email is invalid",
          },
          unique: function (value) {
            return Admin.findOne({ where: { email: value } }).then(
              (admin) => {
                if (admin) {
                  throw new Error("Given Email is already in used");
                }
              }
            );
          },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      },
    },
    {
      sequelize,
      modelName: "Admin"
    }
  );
  return Admin;
};
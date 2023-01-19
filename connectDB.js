const Sequelize = require("sequelize");

const database = "voting";
const username = "postgres";
const password = "postgres";
const sequelize = new Sequelize(database, username, password, {
  host: "localhost",
  dialect: "postgres",
});

const connect = async () => {
    return sequelize.authenticate();
  }
  
  module.exports = {
    connect,
    sequelize
  }
  
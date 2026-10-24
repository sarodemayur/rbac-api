require("dotenv").config();
require("node:dns").setServers(["1.1.1.1", "1.0.0.1"]);

const config = {
  mongodb: {
    url: process.env.MONGODB_URI,
    databaseName: "rbac_db",
    options: {},
  },

  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  lockCollectionName: "changelog_lock",
  lockTtl: 0,
  migrationFileExtension: ".js",
  moduleSystem: "commonjs",
};

module.exports = config;

const path = require('path');

const baseDir = process.env.ZENTRIX_USER_DATA || __dirname;

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(baseDir, 'database.sqlite')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'backend', 'database', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'backend', 'database', 'seeds')
    }
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: path.join(baseDir, 'database.sqlite')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'backend', 'database', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'backend', 'database', 'seeds')
    }
  }
};

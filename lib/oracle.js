var oracledb = require('oracledb'),
  changeCase = require('change-case'),
  _ = require('lodash');

function connect(config) {
  config.connectString = config.host + '/' + config.database;
  return new Promise((resolve, reject) => {
    oracledb.getConnection(config, (err, connection) => {
      if(err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
}

function execute(connection, sql, params) {
  return new Promise((resolve, reject) => {
    params = params || [];
    connection.execute(sql, params, (err, result) => {
      if(err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function objectify(result) {
  return result.rows.map(row => {
    return row.reduce((obj, colVal, colIndex) => {
      var prop = changeCase.camelCase(result.metaData[colIndex].name);
      obj[prop] = colVal;
      return obj;
    }, {});
  });
}

function release(connection) {
  return new Promise((resolve, reject) => {
    connection.release(err => {
      if(err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  connect,
  release,
  execute: (connection, sql, params) => execute(connection, sql, params)
      .then(result => objectify(result))
};

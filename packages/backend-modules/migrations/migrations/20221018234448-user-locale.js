const run = require('../run.js')

const dir = 'packages/backend-modules/auth/migrations/sqls'
const file = '20221018234448-user-locale'

exports.up = (db) => run(db, dir, `${file}-up.sql`)

exports.down = (db) => run(db, dir, `${file}-down.sql`)

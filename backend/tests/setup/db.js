/**
 * Test database strategy
 * ----------------------
 * Default: an in-memory MongoDB started by "mongodb-memory-server".
 *   - Nothing touches your Atlas data.
 *   - The first run downloads a MongoDB binary (~70 MB) into your user cache; later runs are fast.
 *
 * Alternative: set MONGODB_URI_TEST to a SEPARATE database whose name contains "test",
 * e.g. mongodb+srv://user:pass@cluster/odts_test . The helper refuses any other name,
 * because the tests delete all data in the database they use.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

let memoryServer;
let usingExternal = false;

function assertSafeTestUri(uri) {
  const dbName = (uri.split('/')[3] || '').split('?')[0];
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run tests against database "${dbName || '(none)'}". ` +
        'MONGODB_URI_TEST must point to a database whose name contains "test" (e.g. /odts_test).'
    );
  }
}

async function connectTestDB() {
  let uri = process.env.MONGODB_URI_TEST;
  if (uri) {
    assertSafeTestUri(uri);
    usingExternal = true;
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('odts_test');
  }
  await mongoose.connect(uri);
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
}

async function clearTestDB() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function closeTestDB() {
  if (mongoose.connection.readyState === 1) {
    if (usingExternal) await clearTestDB();
    else await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectTestDB, clearTestDB, closeTestDB };

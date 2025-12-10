const admin = require('firebase-admin');

const getFirestore = () => {
  return admin.firestore();
};

const getAuth = () => {
  return admin.auth();
};

const getStorage = () => {
  return admin.storage();
};

module.exports = {
  getFirestore,
  getAuth,
  getStorage
};
const express = require('express');
const {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  updatePasswordHandler,
  deleteUserHandler
} = require('./users.controller');

const router = express.Router();

router.get('/', listUsersHandler);
router.get('/:id', getUserHandler);
router.post('/', createUserHandler);
router.put('/:id', updateUserHandler);
router.patch('/:id/password', updatePasswordHandler);
router.delete('/:id', deleteUserHandler);

module.exports = router;

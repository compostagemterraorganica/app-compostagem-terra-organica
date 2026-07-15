const express = require('express');
const {
  listCentralsHandler,
  getCentralHandler,
  createCentralHandler,
  updateCentralHandler,
  deleteCentralHandler,
  listCentralUsersHandler,
  replaceCentralUsersHandler,
  addCentralUserHandler,
  removeCentralUserHandler
} = require('./centrals.controller');

const router = express.Router();

router.get('/', listCentralsHandler);
router.get('/:id', getCentralHandler);
router.post('/', createCentralHandler);
router.put('/:id', updateCentralHandler);
router.delete('/:id', deleteCentralHandler);
router.get('/:id/users', listCentralUsersHandler);
router.put('/:id/users', replaceCentralUsersHandler);
router.post('/:id/users', addCentralUserHandler);
router.delete('/:id/users/:userId', removeCentralUserHandler);

module.exports = router;

const express = require('express');
const {
  listHandler,
  createHandler,
  updateHandler,
  deleteHandler
} = require('./central-tags.controller');

const router = express.Router();

router.get('/', listHandler);
router.post('/', createHandler);
router.put('/:id', updateHandler);
router.delete('/:id', deleteHandler);

module.exports = router;

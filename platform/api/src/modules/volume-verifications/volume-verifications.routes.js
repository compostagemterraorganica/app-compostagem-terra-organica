const express = require('express');
const { listHandler, getHandler, createHandler, updateHandler, deleteHandler } = require('./volume-verifications.controller');

const router = express.Router();

router.get('/', listHandler);
router.get('/:id', getHandler);
router.post('/', createHandler);
router.put('/:id', updateHandler);
router.delete('/:id', deleteHandler);

module.exports = router;

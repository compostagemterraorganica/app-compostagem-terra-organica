const express = require('express');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./centrals.service');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const data = await service.listPublicCentrals();
  res.json({ success: true, data });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const data = await service.getPublicCentralBySlug(req.params.slug);
  res.json({ success: true, data });
}));

module.exports = router;

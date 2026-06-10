const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./media.service');

const uploadMediaHandler = asyncHandler(async (req, res) => {
  const data = await service.createMedia(req.file, req.user?.id);
  res.status(201).json({ success: true, data });
});

const listMediaHandler = asyncHandler(async (req, res) => {
  const data = await service.listMedia();
  res.json({ success: true, data });
});

const deleteMediaHandler = asyncHandler(async (req, res) => {
  const data = await service.deleteMedia(Number(req.params.id));
  res.json({ success: true, data });
});

module.exports = {
  uploadMediaHandler,
  listMediaHandler,
  deleteMediaHandler
};

const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./pages.service');

const listPagesHandler = asyncHandler(async (req, res) => {
  const data = await service.listPages();
  res.json({ success: true, data });
});

const getPageHandler = asyncHandler(async (req, res) => {
  const data = await service.getPageById(Number(req.params.id));
  res.json({ success: true, data });
});

const createPageHandler = asyncHandler(async (req, res) => {
  const data = await service.createPage(req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

const updatePageHandler = asyncHandler(async (req, res) => {
  const data = await service.updatePage(Number(req.params.id), req.body);
  res.json({ success: true, data });
});

const deletePageHandler = asyncHandler(async (req, res) => {
  const data = await service.deletePage(Number(req.params.id));
  res.json({ success: true, data });
});

const createVersionHandler = asyncHandler(async (req, res) => {
  const data = await service.createVersion(Number(req.params.id), req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

const listVersionsHandler = asyncHandler(async (req, res) => {
  const data = await service.listVersions(Number(req.params.id));
  res.json({ success: true, data });
});

const getLatestVersionHandler = asyncHandler(async (req, res) => {
  const data = await service.getLatestVersion(Number(req.params.id));
  res.json({ success: true, data });
});

const publishPageHandler = asyncHandler(async (req, res) => {
  const data = await service.publishPage(Number(req.params.id));
  res.json({ success: true, data });
});

const getPublicPageHandler = asyncHandler(async (req, res) => {
  const data = await service.getPublicPageBySlug(req.params.slug);
  res.json({ success: true, data });
});

const getPublicPageByIdHandler = asyncHandler(async (req, res) => {
  const data = await service.getPublicPageById(Number(req.params.id));
  res.json({ success: true, data });
});

module.exports = {
  listPagesHandler,
  getPageHandler,
  createPageHandler,
  updatePageHandler,
  deletePageHandler,
  createVersionHandler,
  listVersionsHandler,
  getLatestVersionHandler,
  publishPageHandler,
  getPublicPageHandler,
  getPublicPageByIdHandler
};

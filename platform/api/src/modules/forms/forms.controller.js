const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./forms.service');

const createContatoHandler = asyncHandler(async (req, res) => {
  const data = await service.createContatoSubmission(req.body);
  res.status(201).json({ success: true, data });
});

const createFinanciadorHandler = asyncHandler(async (req, res) => {
  const data = await service.createFinanciadorSubmission(req.body);
  res.status(201).json({ success: true, data });
});

const createContactHandler = asyncHandler(async (req, res) => {
  const data = await service.createContactSubmission(req.body);
  res.status(201).json({ success: true, data });
});

const createCentralRegistrationHandler = asyncHandler(async (req, res) => {
  const data = await service.createCentralRegistrationSubmission(req.body);
  res.status(201).json({ success: true, data });
});

const listSubmissionsHandler = asyncHandler(async (req, res) => {
  const data = await service.listSubmissions({
    formType: req.query.form_type,
    status: req.query.status,
    pageSlug: req.query.page_slug
  });
  res.json({ success: true, data });
});

const getSubmissionHandler = asyncHandler(async (req, res) => {
  const data = await service.getSubmissionById(req.params.id);
  res.json({ success: true, data });
});

const markSubmissionReadHandler = asyncHandler(async (req, res) => {
  const data = await service.markSubmissionAsRead(req.params.id);
  res.json({ success: true, data });
});

const getUnreadCountHandler = asyncHandler(async (_req, res) => {
  const count = await service.getUnreadCount();
  res.json({ success: true, data: { count } });
});

const replySubmissionHandler = asyncHandler(async (req, res) => {
  const data = await service.replyToSubmission(req.params.id, req.body, req.auth);
  res.json({ success: true, data });
});

module.exports = {
  createContatoHandler,
  createFinanciadorHandler,
  createContactHandler,
  createCentralRegistrationHandler,
  listSubmissionsHandler,
  getSubmissionHandler,
  markSubmissionReadHandler,
  getUnreadCountHandler,
  replySubmissionHandler
};

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
  const data = await service.listSubmissions({ formType: req.query.form_type });
  res.json({ success: true, data });
});

module.exports = {
  createContatoHandler,
  createFinanciadorHandler,
  createContactHandler,
  createCentralRegistrationHandler,
  listSubmissionsHandler
};

const { z } = require('zod');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./centrals.service');
const { HttpError } = require('../../utils/httpError');

const listCentralsHandler = asyncHandler(async (req, res) => {
  const data = await service.listCentrals();
  res.json({ success: true, data });
});

const getCentralHandler = asyncHandler(async (req, res) => {
  const data = await service.getCentralById(Number(req.params.id));
  res.json({ success: true, data });
});

const createCentralHandler = asyncHandler(async (req, res) => {
  const data = await service.createCentral(req.body);
  res.status(201).json({ success: true, data });
});

const updateCentralHandler = asyncHandler(async (req, res) => {
  const data = await service.updateCentral(Number(req.params.id), req.body);
  res.json({ success: true, data });
});

const listCentralUsersHandler = asyncHandler(async (req, res) => {
  const data = await service.listCentralUsers(Number(req.params.id));
  res.json({ success: true, data });
});

const replaceCentralUsersHandler = asyncHandler(async (req, res) => {
  const schema = z.object({ userIds: z.array(z.coerce.number().int().positive()) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  await service.replaceCentralUsers(Number(req.params.id), parsed.data.userIds);
  const data = await service.listCentralUsers(Number(req.params.id));
  res.json({ success: true, data });
});

const addCentralUserHandler = asyncHandler(async (req, res) => {
  const schema = z.object({ userId: z.coerce.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  await service.addCentralUser(Number(req.params.id), parsed.data.userId);
  const data = await service.listCentralUsers(Number(req.params.id));
  res.json({ success: true, data });
});

const removeCentralUserHandler = asyncHandler(async (req, res) => {
  await service.removeCentralUser(Number(req.params.id), Number(req.params.userId));
  const data = await service.listCentralUsers(Number(req.params.id));
  res.json({ success: true, data });
});

const deleteCentralHandler = asyncHandler(async (req, res) => {
  await service.deleteCentral(Number(req.params.id));
  res.json({ success: true });
});

module.exports = {
  listCentralsHandler,
  getCentralHandler,
  createCentralHandler,
  updateCentralHandler,
  deleteCentralHandler,
  listCentralUsersHandler,
  replaceCentralUsersHandler,
  addCentralUserHandler,
  removeCentralUserHandler
};

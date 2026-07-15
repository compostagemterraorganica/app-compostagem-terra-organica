const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./central-tags.service');
const { userHasCentralAccess } = require('../auth/auth-codes.service');
const { HttpError } = require('../../utils/httpError');

async function assertCentralAccess(req, centralId) {
  if (req.auth.isAdministrator) return;
  const allowed = await userHasCentralAccess(req.auth.user.id, centralId);
  if (!allowed) throw new HttpError(403, 'Sem permissao para acessar esta central');
}

const listHandler = asyncHandler(async (req, res) => {
  const centralId = Number(req.query.central_id);
  if (!centralId) throw new HttpError(400, 'central_id obrigatorio');

  await assertCentralAccess(req, centralId);

  const data = await service.listTagsByCentral(centralId);
  res.json({ success: true, data });
});

const createHandler = asyncHandler(async (req, res) => {
  const centralId = Number(req.body.central_id);
  if (!centralId) throw new HttpError(400, 'central_id obrigatorio');

  await assertCentralAccess(req, centralId);

  const data = await service.createTag(req.body);
  res.status(201).json({ success: true, data });
});

const updateHandler = asyncHandler(async (req, res) => {
  const existing = await service.getTagById(Number(req.params.id));
  await assertCentralAccess(req, existing.central_id);

  const data = await service.updateTag(Number(req.params.id), req.body);
  res.json({ success: true, data });
});

const deleteHandler = asyncHandler(async (req, res) => {
  const existing = await service.getTagById(Number(req.params.id));
  await assertCentralAccess(req, existing.central_id);

  await service.deleteTag(Number(req.params.id));
  res.json({ success: true });
});

module.exports = {
  listHandler,
  createHandler,
  updateHandler,
  deleteHandler
};

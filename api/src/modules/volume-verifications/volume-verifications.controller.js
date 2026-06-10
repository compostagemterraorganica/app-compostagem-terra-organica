const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./volume-verifications.service');
const { userHasCentralAccess } = require('../auth/auth-codes.service');
const { HttpError } = require('../../utils/httpError');

async function assertCentralAccess(req, centralId) {
  if (req.auth.isAdministrator) return;
  const allowed = await userHasCentralAccess(req.auth.user.id, centralId);
  if (!allowed) throw new HttpError(403, 'Sem permissao para acessar esta central');
}

const listHandler = asyncHandler(async (req, res) => {
  const centralId = req.query.central_id ? Number(req.query.central_id) : undefined;

  if (centralId) {
    await assertCentralAccess(req, centralId);
  }

  const data = await service.listVerifications({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
    centralId,
    userId: req.auth.isAdministrator ? undefined : req.auth.user.id,
    fromDate: req.query.from_date,
    toDate: req.query.to_date
  });
  res.json({ success: true, data });
});

const getHandler = asyncHandler(async (req, res) => {
  const data = await service.getVerificationById(Number(req.params.id));
  await assertCentralAccess(req, data.central_id);
  res.json({ success: true, data });
});

const createHandler = asyncHandler(async (req, res) => {
  const centralId = Number(req.body.central_id);
  if (!centralId) throw new HttpError(400, 'central_id obrigatorio');

  await assertCentralAccess(req, centralId);

  const data = await service.createVerification(req.body);
  res.status(201).json({ success: true, data });
});

const updateHandler = asyncHandler(async (req, res) => {
  const existing = await service.getVerificationById(Number(req.params.id));
  await assertCentralAccess(req, existing.central_id);

  const data = await service.updateVerification(Number(req.params.id), req.body);
  res.json({ success: true, data });
});

const deleteHandler = asyncHandler(async (req, res) => {
  const existing = await service.getVerificationById(Number(req.params.id));
  await assertCentralAccess(req, existing.central_id);

  await service.deleteVerification(Number(req.params.id));
  res.json({ success: true });
});

module.exports = {
  listHandler,
  getHandler,
  createHandler,
  updateHandler,
  deleteHandler
};

const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./users.service');

const listUsersHandler = asyncHandler(async (req, res) => {
  const data = await service.listUsers();
  res.json({ success: true, data });
});

const getUserHandler = asyncHandler(async (req, res) => {
  const data = await service.getUserById(Number(req.params.id));
  res.json({ success: true, data });
});

const createUserHandler = asyncHandler(async (req, res) => {
  const data = await service.createUser(req.body);
  res.status(201).json({ success: true, data });
});

const updateUserHandler = asyncHandler(async (req, res) => {
  const data = await service.updateUser(Number(req.params.id), req.body);
  res.json({ success: true, data });
});

const updatePasswordHandler = asyncHandler(async (req, res) => {
  await service.updatePassword(Number(req.params.id), req.body.password);
  res.json({ success: true });
});

const deleteUserHandler = asyncHandler(async (req, res) => {
  await service.deleteUser(Number(req.params.id));
  res.json({ success: true });
});

module.exports = {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  updatePasswordHandler,
  deleteUserHandler
};

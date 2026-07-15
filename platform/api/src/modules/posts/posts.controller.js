const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./posts.service');

const listPostsHandler = asyncHandler(async (req, res) => {
  const includeDraft = req.query.scope !== 'public';
  const data = await service.listPosts(includeDraft);
  res.json({ success: true, data });
});

const listPublicPostsHandler = asyncHandler(async (req, res) => {
  const result = await service.listPublicPosts({
    page: req.query.page,
    limit: req.query.limit,
    excludeCategory: req.query.excludeCategory !== undefined ? req.query.excludeCategory : 'central'
  });
  res.json({ success: true, ...result });
});

const listRecentPublicPostsHandler = asyncHandler(async (req, res) => {
  const data = await service.listRecentPublicPosts({
    limit: req.query.limit,
    excludeSlug: req.query.excludeSlug || null
  });
  res.json({ success: true, data });
});

const getPostHandler = asyncHandler(async (req, res) => {
  const data = await service.getPostById(Number(req.params.id));
  res.json({ success: true, data });
});

const createPostHandler = asyncHandler(async (req, res) => {
  const data = await service.createPost(req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

const updatePostHandler = asyncHandler(async (req, res) => {
  const data = await service.updatePost(Number(req.params.id), req.body);
  res.json({ success: true, data });
});

const deletePostHandler = asyncHandler(async (req, res) => {
  const data = await service.deletePost(Number(req.params.id));
  res.json({ success: true, data });
});

const getPublicPostHandler = asyncHandler(async (req, res) => {
  const data = await service.getPublicPostBySlug(req.params.slug);
  res.json({ success: true, data });
});

module.exports = {
  listPostsHandler,
  listPublicPostsHandler,
  listRecentPublicPostsHandler,
  getPostHandler,
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
  getPublicPostHandler
};

const express = require('express')
const multer = require('multer')
const {
  uploadMediaHandler,
  listMediaHandler,
  deleteMediaHandler
} = require('./media.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const router = express.Router();

router.post('/upload', upload.single('image'), uploadMediaHandler);
router.get('/', listMediaHandler);
router.delete('/:id', deleteMediaHandler);

module.exports = router;

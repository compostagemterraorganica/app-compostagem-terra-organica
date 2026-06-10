const express = require('express');
const {
  getKpisHandler,
  getVolumeByCentralHandler,
  getVolumeTimeSeriesHandler,
  getVolumeExportReportHandler
} = require('./analytics.controller');

const router = express.Router();

router.get('/kpis', getKpisHandler);
router.get('/volume-by-central', getVolumeByCentralHandler);
router.get('/volume-timeseries', getVolumeTimeSeriesHandler);
router.get('/export-volume-report', getVolumeExportReportHandler);

module.exports = router;

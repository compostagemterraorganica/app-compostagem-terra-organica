const express = require('express');
const {
  getKpisHandler,
  getVolumeByCentralHandler,
  getVolumeTimeSeriesHandler,
  getVolumeExportReportHandler,
  getCentralsAnalysisHandler,
  getCentralVerificationsHandler
} = require('./analytics.controller');

const router = express.Router();

router.get('/centrals-analysis', getCentralsAnalysisHandler);
router.get('/centrals/:centralId/verifications', getCentralVerificationsHandler);
router.get('/kpis', getKpisHandler);
router.get('/volume-by-central', getVolumeByCentralHandler);
router.get('/volume-timeseries', getVolumeTimeSeriesHandler);
router.get('/export-volume-report', getVolumeExportReportHandler);

module.exports = router;

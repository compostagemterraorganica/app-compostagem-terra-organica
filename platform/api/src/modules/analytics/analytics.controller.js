const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./analytics.service');

function parseFilters(query) {
  const wasteType =
    service.normalizeWasteType(query.waste_type) ||
    service.normalizeWasteType(query.category) ||
    null;

  return {
    fromDate: query.from_date || null,
    toDate: query.to_date || null,
    centralIds: service.parseIdList(query.central_ids || query.central_id),
    tagIds: service.parseIdList(query.tag_ids || query.tag_id),
    tagNames: service.parseNameList(query.tag_names || query.tag_name),
    wasteType
  };
}

const getKpisHandler = asyncHandler(async (req, res) => {
  const data = await service.getKpis(parseFilters(req.query));
  res.json({ success: true, data });
});

const getVolumeByCentralHandler = asyncHandler(async (req, res) => {
  const data = await service.getVolumeByCentral(parseFilters(req.query));
  res.json({ success: true, data });
});

const getVolumeTimeSeriesHandler = asyncHandler(async (req, res) => {
  const data = await service.getVolumeTimeSeries(parseFilters(req.query));
  res.json({ success: true, data });
});

const getCentralsAnalysisHandler = asyncHandler(async (req, res) => {
  const data = await service.getCentralsAnalysis(parseFilters(req.query));
  res.json({ success: true, data });
});

const getCentralVerificationsHandler = asyncHandler(async (req, res) => {
  const centralId = Number(req.params.centralId);
  if (!Number.isInteger(centralId) || centralId <= 0) {
    res.status(400).json({ success: false, message: 'centralId invalido' });
    return;
  }

  const data = await service.getCentralVerifications(centralId, parseFilters(req.query), {
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 50)
  });
  res.json({ success: true, data });
});

function escapeCsvCell(value) {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function sheetToCsv(sheet) {
  return sheet.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

const getVolumeExportReportHandler = asyncHandler(async (req, res) => {
  const report = await service.getVolumeExportReport(parseFilters(req.query));
  const wantJson = String(req.query.format || '').toLowerCase() === 'json';

  if (wantJson) {
    res.json({
      success: true,
      report: { sheet: report.sheet },
      data: report.data,
      generatedAt: report.generatedAt
    });
    return;
  }

  const csvBody = `\uFEFF${sheetToCsv(report.sheet)}`;
  const filename = `relatorio-volume-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvBody);
});

module.exports = {
  getKpisHandler,
  getVolumeByCentralHandler,
  getVolumeTimeSeriesHandler,
  getVolumeExportReportHandler,
  getCentralsAnalysisHandler,
  getCentralVerificationsHandler
};

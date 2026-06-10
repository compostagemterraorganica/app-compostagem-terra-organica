const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./analytics.service');

function parseFilters(query) {
  return {
    fromDate: query.from_date || null,
    toDate: query.to_date || null
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
  getVolumeExportReportHandler
};

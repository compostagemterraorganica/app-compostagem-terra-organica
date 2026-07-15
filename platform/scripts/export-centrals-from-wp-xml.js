#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { exportCentralsFromWordPressXml } = require('./lib/wp-xml-centrals-export');

const SCRIPTS_DIR = __dirname;
const REPORTS_DIR = path.join(SCRIPTS_DIR, 'reports');

const centralsXmlPath = path.join(SCRIPTS_DIR, 'terraorgnica.WordPress.2026-06-19).xml');
const estadoXmlPath = path.join(SCRIPTS_DIR, 'estado.xml');
const cidadeXmlPath = path.join(SCRIPTS_DIR, 'cidade.xml');

function main() {
  for (const filePath of [centralsXmlPath, estadoXmlPath, cidadeXmlPath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo nao encontrado: ${filePath}`);
    }
  }

  const report = exportCentralsFromWordPressXml({
    centralsXmlPath,
    estadoXmlPath,
    cidadeXmlPath
  });

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const outputPath = path.join(REPORTS_DIR, 'centrals-from-wordpress.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Centrais exportadas: ${report.centrals.length}`);
  console.log(`Estados no lookup: ${report.counts.estados}`);
  console.log(`Cidades no lookup: ${report.counts.cidades}`);
  console.log(`Arquivo: ${outputPath}`);
}

main();

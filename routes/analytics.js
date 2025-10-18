const express = require('express');
const axios = require('axios');
const logger = require('../utils/logger');
const router = express.Router();

// Configurações do WordPress (usando as mesmas variáveis de ambiente)
const WORDPRESS_CONFIG = {
  siteUrl: process.env.WORDPRESS_SITE_URL,
  email: process.env.WORDPRESS_EMAIL,
  password: process.env.WORDPRESS_PASS
};

// Função para gerar Basic Auth header
function getBasicAuthHeader() {
  if (!WORDPRESS_CONFIG.email || !WORDPRESS_CONFIG.password) {
    throw new Error('WORDPRESS_EMAIL e WORDPRESS_PASS devem estar configurados no .env');
  }
  const credentials = Buffer.from(`${WORDPRESS_CONFIG.email}:${WORDPRESS_CONFIG.password}`).toString('base64');
  return `Basic ${credentials}`;
}

// Middleware para verificar autenticação (opcional para analytics)
const verifyAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({
        success: false,
        error: 'Autenticação Basic Auth necessária'
      });
    }

    // Verificar se as credenciais estão corretas
    const providedCredentials = authHeader.replace('Basic ', '');
    const expectedCredentials = Buffer.from(`${WORDPRESS_CONFIG.email}:${WORDPRESS_CONFIG.password}`).toString('base64');
    
    if (providedCredentials !== expectedCredentials) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    next();
  } catch (error) {
    logger.error('Erro na verificação de autenticação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Função para buscar todas as centrais
async function getAllCentrals() {
  try {
    const response = await axios.get(`${WORDPRESS_CONFIG.siteUrl}/wp-json/wp/v2/central?per_page=100`, {
      headers: {
        'Authorization': getBasicAuthHeader(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    logger.error('Erro ao buscar centrais:', error.message);
    throw error;
  }
}

// Função para buscar verificações de volume por central
async function getVolumeVerifications(centralName) {
  try {
    const encodedName = encodeURIComponent(centralName);
    const response = await axios.get(
      `${WORDPRESS_CONFIG.siteUrl}/wp-json/wp/v2/verificacoes-de-volu?per_page=100&search=${encodedName}`,
      {
        headers: {
          'Authorization': getBasicAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    logger.error(`Erro ao buscar verificações para ${centralName}:`, error.message);
    throw error;
  }
}

// Função para calcular métricas de uma central
function calculateCentralMetrics(central, verifications) {
  const volumes = verifications
    .map(v => parseFloat(v.meta?.volume || 0))
    .filter(volume => !isNaN(volume) && volume > 0);

  const totalVolume = volumes.reduce((sum, volume) => sum + volume, 0);
  const postCount = volumes.length;
  const averageVolume = postCount > 0 ? totalVolume / postCount : 0;

  // Calcular volume por mês (período completo de cada central)
  const monthlyVolumes = {};
  const quarterlyVolumes = {};
  const semesterlyVolumes = {};

  // Encontrar o período completo dos dados da central
  const allDates = verifications
    .map(v => new Date(v.date))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a - b);

  if (allDates.length === 0) {
    // Se não há dados, retornar métricas zeradas
    return {
      central: {
        id: central.id,
        name: central.title?.rendered || central.name || central.title,
        slug: central.slug
      },
      metrics: {
        totalVolume: 0,
        averageVolume: 0,
        postCount: 0,
        averageMonthlyVolume: 0,
        averageMonthlyPosts: 0,
        monthlyVolumes: [],
        quarterlyVolumes: [],
        semesterlyVolumes: []
      }
    };
  }

  // Gerar todos os meses entre a primeira e última postagem
  const startDate = new Date(allDates[0].getFullYear(), allDates[0].getMonth(), 1);
  const endDate = new Date(allDates[allDates.length - 1].getFullYear(), allDates[allDates.length - 1].getMonth(), 1);
  const allMonths = [];
  
  for (let date = new Date(startDate); date <= endDate; date.setMonth(date.getMonth() + 1)) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    allMonths.push(monthKey);
    monthlyVolumes[monthKey] = 0; // Inicializar com 0
  }

  verifications.forEach(verification => {
    const date = new Date(verification.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const semester = month <= 6 ? 1 : 2;

    const volume = parseFloat(verification.meta?.volume || 0);
    if (isNaN(volume) || volume <= 0) return;

    // Por mês - adicionar volume para o mês correspondente
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    monthlyVolumes[monthKey] = (monthlyVolumes[monthKey] || 0) + volume;

    // Por trimestre
    const quarterKey = `${year}-Q${quarter}`;
    quarterlyVolumes[quarterKey] = (quarterlyVolumes[quarterKey] || 0) + volume;

    // Por semestre
    const semesterKey = `${year}-S${semester}`;
    semesterlyVolumes[semesterKey] = (semesterlyVolumes[semesterKey] || 0) + volume;
  });

  // Calcular média mensal de volume
  const monthlyValues = Object.values(monthlyVolumes);
  const averageMonthlyVolume = monthlyValues.length > 0 
    ? monthlyValues.reduce((sum, vol) => sum + vol, 0) / monthlyValues.length 
    : 0;

  // Debug: verificar se há dados nos volumes mensais
  const monthlyData = allMonths.map(month => ({ month, volume: Math.round(monthlyVolumes[month] || 0) }));
  const hasData = monthlyData.some(d => d.volume > 0);
  
  if (central.title?.rendered || central.name) {
    logger.server.info(`Central ${central.title?.rendered || central.name}: ${monthlyData.length} meses, ${hasData ? 'com' : 'sem'} dados`);
  }

  // Calcular média mensal de posts
  const averageMonthlyPosts = allMonths.length > 0 
    ? postCount / allMonths.length 
    : 0;

  return {
    central: {
      id: central.id,
      name: central.title?.rendered || central.name || central.title,
      slug: central.slug
    },
    metrics: {
      totalVolume: Math.round(totalVolume * 100) / 100,
      averageVolume: Math.round(averageVolume * 100) / 100,
      postCount,
      averageMonthlyVolume: Math.round(averageMonthlyVolume * 100) / 100,
      averageMonthlyPosts: Math.round(averageMonthlyPosts * 100) / 100,
      monthlyVolumes: allMonths
        .map(month => ({ month, volume: Math.round(monthlyVolumes[month] || 0) })),
      quarterlyVolumes: Object.entries(quarterlyVolumes)
        .map(([quarter, volume]) => ({ quarter, volume: Math.round(volume * 100) / 100 }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter)),
      semesterlyVolumes: Object.entries(semesterlyVolumes)
        .map(([semester, volume]) => ({ semester, volume: Math.round(volume * 100) / 100 }))
        .sort((a, b) => a.semester.localeCompare(b.semester))
    }
  };
}

// Rota para obter análise de todas as centrais (sem autenticação)
router.get('/centrals-analysis', async (req, res) => {
  try {
    // Verificar se as configurações estão disponíveis
    if (!WORDPRESS_CONFIG.siteUrl || !WORDPRESS_CONFIG.email || !WORDPRESS_CONFIG.password) {
      return res.status(500).json({
        success: false,
        error: 'Configurações do WordPress não encontradas',
        message: 'Verifique se WORDPRESS_SITE_URL, WORDPRESS_EMAIL e WORDPRESS_PASS estão configurados no .env'
      });
    }

    logger.separator('CENTRALS ANALYSIS REQUEST');
    logger.server.info('Iniciando análise de centrais...');

    // Buscar todas as centrais
    const centrals = await getAllCentrals();
    logger.server.info(`Encontradas ${centrals.length} centrais`);

    const results = [];

    // Processar cada central
    for (const central of centrals) {
      try {
        const centralName = central.title?.rendered || central.name || central.title;
        logger.server.info(`Processando central: ${centralName}`);

        // Buscar verificações de volume para esta central
        const verifications = await getVolumeVerifications(centralName);
        logger.server.info(`Encontradas ${verifications.length} verificações para ${centralName}`);

        // Calcular métricas
        const metrics = calculateCentralMetrics(central, verifications);
        results.push(metrics);

      } catch (error) {
        logger.error(`Erro ao processar central ${central.title?.rendered || central.name}:`, error.message);
        // Adicionar central com métricas zeradas em caso de erro
        results.push({
          central: {
            id: central.id,
            name: central.title?.rendered || central.name || central.title,
            slug: central.slug
          },
          metrics: {
            totalVolume: 0,
            averageVolume: 0,
            postCount: 0,
            averageMonthlyVolume: 0,
            monthlyVolumes: [],
            quarterlyVolumes: [],
            semesterlyVolumes: []
          },
          error: error.message
        });
      }
    }

    // Ordenar por volume total (decrescente)
    results.sort((a, b) => b.metrics.totalVolume - a.metrics.totalVolume);

    logger.server.success('Análise de centrais concluída');
    logger.separator();

    res.json({
      success: true,
      data: {
        centrals: results,
        summary: {
          totalCentrals: results.length,
          totalVolume: results.reduce((sum, r) => sum + r.metrics.totalVolume, 0),
          totalPosts: results.reduce((sum, r) => sum + r.metrics.postCount, 0),
          averageVolumePerCentral: results.length > 0 
            ? results.reduce((sum, r) => sum + r.metrics.totalVolume, 0) / results.length 
            : 0
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Erro na análise de centrais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// Rota para servir dashboard HTML (sem autenticação obrigatória para facilitar acesso)
router.get('/dashboard', async (req, res) => {
  try {
    // Verificar se as configurações estão disponíveis
    if (!WORDPRESS_CONFIG.siteUrl || !WORDPRESS_CONFIG.email || !WORDPRESS_CONFIG.password) {
      return res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Configuração Necessária</h1>
            <p>As configurações do WordPress não foram encontradas.</p>
            <p>Verifique se WORDPRESS_SITE_URL, WORDPRESS_EMAIL e WORDPRESS_PASS estão configurados no .env</p>
          </body>
        </html>
      `);
    }

    // Retornar página com loader que carrega dados via AJAX
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Análise de Centrais</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-image: url('https://compostagemterraorganica.com.br/wp-content/uploads/2021/01/site-principal-red.jpg');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            min-height: 100vh;
            padding: 20px;
        }
        
        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        
        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 6px solid #f3f3f3;
            border-top: 6px solid #9d7b4e;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        .loading-text {
            color: white;
            font-size: 1.2em;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            display: none;
        }
        
        .header {
            background: linear-gradient(135deg, #9d7b4e 0%, #8a6d3b 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .logo {
            max-width: 200px;
            height: 50px;
            margin-bottom: 15px;
            filter: brightness(0) invert(1);
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            border-left: 4px solid #4CAF50;
        }
        
        .summary-card h3 {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .summary-card .value {
            font-size: 2.5em;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 5px;
        }
        
        .summary-card .unit {
            color: #999;
            font-size: 0.9em;
        }
        
        .centrals-section {
            padding: 30px;
        }
        
        .centrals-section h2 {
            color: #333;
            margin-bottom: 25px;
            font-size: 1.8em;
        }
        
        .central-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.05);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .central-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .central-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .central-name {
            font-size: 1.4em;
            font-weight: bold;
            color: #333;
        }
        
        .central-volume {
            font-size: 1.8em;
            font-weight: bold;
            color: #4CAF50;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .metric {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .metric-label {
            font-size: 0.85em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .metric-value {
            font-size: 1.3em;
            font-weight: bold;
            color: #333;
        }
        
        .charts-section {
            margin-top: 20px;
        }
        
        .chart-container {
            margin-bottom: 25px;
        }
        
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .chart-title {
            font-size: 1.1em;
            font-weight: bold;
            color: #333;
            margin: 0;
        }
        
        .chart-type-select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            font-size: 14px;
            cursor: pointer;
        }
        
        .chart-type-select:focus {
            outline: none;
            border-color: #4CAF50;
        }
        
        .line-chart {
            position: relative;
            height: 300px;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .line-chart canvas {
            width: 100% !important;
            height: 100% !important;
        }
        
        .chart-svg {
            width: 100%;
            height: 100%;
        }
        
        .chart-line {
            fill: none;
            stroke: #4CAF50;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        
        .chart-point {
            fill: #4CAF50;
            stroke: white;
            stroke-width: 2;
            cursor: pointer;
        }
        
        .chart-grid {
            stroke: #e0e0e0;
            stroke-width: 1;
        }
        
        .y-axis-label {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            fill: #666;
        }
        
        .y-axis-title {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            font-weight: bold;
            fill: #333;
        }
        
        .point-value {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11px;
            font-weight: bold;
            fill: #333;
            text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
        }
        
        .chart-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 0.8em;
            color: #666;
        }
        
        .chart-tooltip {
            position: absolute;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.9em;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
        }
        
        .no-data {
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 20px;
        }
        
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 25px;
            font-size: 1em;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
            transition: all 0.3s;
        }
        
        .refresh-btn:hover {
            background: #45a049;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading-container" id="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Carregando dados das centrais...</div>
    </div>
    
    <div class="container" id="dashboard">
        <div class="header">
            <img src="https://compostagemterraorganica.com.br/wp-content/uploads/2020/11/cropped-LOGO_CTO_HORIZ-2.png" alt="Terra Orgânica" class="logo">
            <h1>📊 Dashboard de Centrais</h1>
            <p>Análise de Volume e Performance das Centrais de Compostagem</p>
        </div>
        
        <div class="summary" id="summary">
            <!-- Dados carregados via AJAX -->
        </div>
        
        <div class="centrals-section">
            <h2>📈 Análise por Central</h2>
            <div id="centrals">
                <!-- Dados carregados via AJAX -->
            </div>
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
    
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    <script>
        // Registrar plugin de datalabels
        Chart.register(ChartDataLabels);
        
        // Armazenar instâncias dos gráficos
        const chartInstances = {};
        
        async function loadDashboard() {
            try {
                const response = await fetch('/analytics/centrals-analysis?t=' + Date.now());
                const data = await response.json();
                
                if (data.success) {
                    renderDashboard(data.data);
                } else {
                    throw new Error(data.error || 'Erro ao carregar dados');
                }
            } catch (error) {
                console.error('Erro ao carregar dashboard:', error);
                document.getElementById('loading').innerHTML = 
                    '<div style="color: white; text-align: center;"><h2>❌ Erro ao carregar dados</h2><p>' + error.message + '</p></div>';
            }
        }
        
        function renderDashboard(data) {
            const { centrals, summary } = data;
            
            // Renderizar resumo
            document.getElementById('summary').innerHTML = \`
                <div class="summary-card">
                    <h3>Total de Centrais</h3>
                    <div class="value">\${summary.totalCentrals}</div>
                    <div class="unit">centrais ativas</div>
                </div>
                <div class="summary-card">
                    <h3>Volume Total</h3>
                    <div class="value">\${Math.round(summary.totalVolume)}</div>
                    <div class="unit">litros</div>
                </div>
                <div class="summary-card">
                    <h3>Total de Posts</h3>
                    <div class="value">\${summary.totalPosts}</div>
                    <div class="unit">verificações</div>
                </div>
                <div class="summary-card">
                    <h3>Média por Central</h3>
                    <div class="value">\${Math.round(summary.averageVolumePerCentral)}</div>
                    <div class="unit">litros/central</div>
                </div>
            \`;
            
            // Renderizar centrais
            document.getElementById('centrals').innerHTML = centrals.map(central => \`
                <div class="central-card">
                    <div class="central-header">
                        <div class="central-name">\${central.central.name}</div>
                        <div class="central-volume">\${Math.round(central.metrics.totalVolume)}L</div>
                    </div>
                    
                    <div class="metrics-grid">
                        <div class="metric">
                            <div class="metric-label">Quantidade de Posts</div>
                            <div class="metric-value">\${central.metrics.postCount}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Volume Médio por Post</div>
                            <div class="metric-value">\${Math.round(central.metrics.averageVolume)}L</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Média Mensal Posts</div>
                            <div class="metric-value">\${Math.round(central.metrics.averageMonthlyPosts)}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Média Mensal Volume</div>
                            <div class="metric-value">\${Math.round(central.metrics.averageMonthlyVolume)}L</div>
                        </div>
                    </div>
                    
                    \${central.metrics.monthlyVolumes.length > 0 ? \`
                        <div class="charts-section">
                            <div class="chart-container">
                                <div class="chart-header">
                                    <div class="chart-title">📈 Volume por Mês (Período Completo)</div>
                                    <select class="chart-type-select" onchange="changeChartType('\${central.central.id}', this.value)">
                                        <option value="line">Linha</option>
                                        <option value="bar">Barra</option>
                                    </select>
                                </div>
                                <div class="line-chart">
                                    <canvas id="chart-\${central.central.id}" width="800" height="200"></canvas>
                                </div>
                            </div>
                        </div>
                    \` : '<div class="no-data">Nenhum dado mensal disponível</div>'}
                </div>
            \`).join('');
            
            // Mostrar dashboard e esconder loading
            document.getElementById('loading').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            
            // Criar gráficos com Chart.js
            createCharts(data);
        }
        
        function createCharts(data) {
            data.centrals.forEach(central => {
                if (central.metrics.monthlyVolumes.length > 0) {
                    const ctx = document.getElementById(\`chart-\${central.central.id}\`);
                    if (ctx) {
                        const chartData = central.metrics.monthlyVolumes.map((month, index) => ({
                            x: index,
                            y: month.volume
                        }));
                        
                        chartInstances[central.central.id] = new Chart(ctx, {
                            type: 'line',
                            data: {
                                datasets: [{
                                    label: 'Volume (L)',
                                    data: chartData,
                                    borderColor: '#4CAF50',
                                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                    borderWidth: 3,
                                    pointBackgroundColor: '#4CAF50',
                                    pointBorderColor: '#4CAF50',
                                    pointRadius: 6,
                                    pointHoverRadius: 8,
                                    tension: 0.1,
                                    pointLabel: {
                                        display: true,
                                        content: function(context) {
                                            return Math.round(context.parsed.y) + 'L';
                                        }
                                    }
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    x: {
                                        type: 'category',
                                        labels: central.metrics.monthlyVolumes.map(month => {
                                            const date = new Date(month.month + '-01');
                                            return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                                        }),
                                        title: {
                                            display: true,
                                            text: 'Mês'
                                        }
                                    },
                                    y: {
                                        beginAtZero: true,
                                        title: {
                                            display: true,
                                            text: 'Volume (L)'
                                        },
                                        ticks: {
                                            callback: function(value) {
                                                return value + 'L';
                                            }
                                        }
                                    }
                                },
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            title: function(context) {
                                                const monthIndex = context[0].dataIndex;
                                                const month = central.metrics.monthlyVolumes[monthIndex];
                                                const date = new Date(month.month + '-01');
                                                return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                                            },
                                            label: function(context) {
                                                return 'Volume: ' + Math.round(context.parsed.y) + 'L';
                                            }
                                        }
                                    },
                                    legend: {
                                        display: false
                                    },
                                    datalabels: {
                                        display: true,
                                        color: '#333',
                                        font: {
                                            weight: 'bold',
                                            size: 11
                                        },
                                        formatter: function(value, context) {
                                            return Math.round(value.y) + 'L';
                                        },
                                        anchor: 'end',
                                        align: 'top',
                                        offset: 4
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
        
        function changeChartType(centralId, chartType) {
            const chart = chartInstances[centralId];
            if (chart) {
                chart.config.type = chartType;
                chart.update();
            }
        }
        
        // Carregar dashboard quando a página carregar
        document.addEventListener('DOMContentLoaded', loadDashboard);
    </script>
</body>
</html>
    `;

    res.send(html);

  } catch (error) {
    logger.error('Erro ao gerar dashboard:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Erro ao carregar dashboard</h1>
          <p>${error.message}</p>
          <button onclick="location.reload()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Tentar Novamente
          </button>
        </body>
      </html>
    `);
  }
});

module.exports = router;
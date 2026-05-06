let glucoseChart = null;
let readingsTable = null;
let allReadings = []; // Global store for original data

const translations = {
    en: {
        sync_btn: "Sync Device",
        export_btn: "Export CSV",
        status_ready: "Ready",
        status_syncing: "Syncing...",
        status_exporting: "Exporting...",
        status_no_data: "No data to export.",
        chart_title: "Glucose Trends",
        table_title: "All Readings",
        th_timestamp: "Timestamp",
        th_value: "Value",
        th_unit: "Unit",
        search_placeholder: "Filter...",
        range_low: "Low",
        range_target: "In Target",
        range_caution: "Caution",
        range_high: "High",
        range_very_high: "Very High",
        range_unknown: "Unknown",
        series_name: "Glucose Level"
    },
    ja: {
        sync_btn: "デバイス同期",
        export_btn: "CSV出力",
        status_ready: "準備完了",
        status_syncing: "同期中...",
        status_exporting: "出力中...",
        status_no_data: "出力するデータがありません。",
        chart_title: "血糖値トレンド",
        table_title: "全測定データ",
        th_timestamp: "日時",
        th_value: "数値",
        th_unit: "単位",
        search_placeholder: "フィルタ...",
        range_low: "低血糖",
        range_target: "目標範囲内",
        range_caution: "高め (注意)",
        range_high: "高血糖",
        range_very_high: "非常に高い",
        range_unknown: "不明",
        series_name: "血糖値"
    }
};

let currentLanguage = 'en';

function changeLanguage(lang) {
    currentLanguage = lang;
    const selector = document.getElementById('language-selector');
    if (selector) selector.value = lang;
    updateStaticText();
    
    // If table exists, we need to re-initialize it to update search placeholder and headers
    if (readingsTable) {
        readingsTable.destroy();
        readingsTable = null;
    }
    
    if (allReadings.length > 0) {
        updateUI({ readings: allReadings });
    } else {
        // Just refresh table headers if empty
        updateTable([]);
    }
}

function updateStaticText() {
    const t = translations[currentLanguage];
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) syncBtn.innerText = t.sync_btn;
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.innerText = t.export_btn;
    
    const chartTitle = document.getElementById('chart-title');
    if (chartTitle) chartTitle.innerText = t.chart_title;
    
    const tableTitle = document.getElementById('table-title');
    if (tableTitle) tableTitle.innerText = t.table_title;
    
    const thTimestamp = document.getElementById('th-timestamp');
    if (thTimestamp) thTimestamp.innerText = t.th_timestamp;
    
    const thValue = document.getElementById('th-value');
    if (thValue) thValue.innerText = t.th_value;
    
    const thUnit = document.getElementById('th-unit');
    if (thUnit) thUnit.innerText = t.th_unit;
    
    const statusEl = document.getElementById('status');
    if (statusEl) {
        // Simple way to handle initial/ready state
        if (statusEl.innerText === translations.en.status_ready || 
            statusEl.innerText === translations.ja.status_ready ||
            statusEl.innerText === "Ready") {
            statusEl.innerText = t.status_ready;
        }
    }
}

async function syncDevice() {
    updateStatus(translations[currentLanguage].status_syncing);
    setButtonsDisabled(true);
    try {
        const result = await pywebview.api.sync_device();
        updateStatus(result.message);
        loadData();
    } catch (e) {
        updateStatus('Error: ' + e);
    } finally {
        setButtonsDisabled(false);
    }
}

async function exportCSV() {
    if (!readingsTable) return;
    
    const visibleData = readingsTable.rows({ search: 'applied' }).data().toArray();
    
    if (visibleData.length === 0) {
        updateStatus(translations[currentLanguage].status_no_data);
        return;
    }

    updateStatus(translations[currentLanguage].status_exporting);
    setButtonsDisabled(true);
    try {
        const result = await pywebview.api.export_csv(visibleData);
        updateStatus(result.message);
    } catch (e) {
        updateStatus('Export Error: ' + e);
    } finally {
        setButtonsDisabled(false);
    }
}

async function loadData() {
    try {
        const data = await pywebview.api.get_data();
        allReadings = data.readings || [];
        updateUI(data);
    } catch (e) {
        console.error('Failed to load data:', e);
    }
}

function updateStatus(msg) {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = msg;
}

function setButtonsDisabled(disabled) {
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) syncBtn.disabled = disabled;
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.disabled = disabled;
}

function updateUI(data) {
    updateTable(data.readings);
    renderChart(data.readings);
}

function getAppropriatePageLength() {
    const windowHeight = window.innerHeight;
    return windowHeight < 700 ? 5 : 10;
}

function getGlucoseRange(value, unit) {
    const isMmol = (unit === 'mmol/L');
    if (isMmol) {
        if (value < 3.9) return 'low';
        if (value <= 7.8) return 'target';
        if (value <= 10.0) return 'caution';
        if (value <= 13.9) return 'high';
        return 'very-high';
    } else {
        if (value < 70) return 'low';
        if (value <= 140) return 'target';
        if (value <= 180) return 'caution';
        if (value <= 250) return 'high';
        return 'very-high';
    }
}

function getRangeLabel(range) {
    const t = translations[currentLanguage];
    switch(range) {
        case 'low': return t.range_low;
        case 'target': return t.range_target;
        case 'caution': return t.range_caution;
        case 'high': return t.range_high;
        case 'very-high': return t.range_very_high;
        default: return t.range_unknown;
    }
}

function getRangeColor(range) {
    switch(range) {
        case 'low': return '#ef4444';
        case 'target': return '#22c55e';
        case 'caution': return '#f59e0b';
        case 'high': return '#ef4444';
        case 'very-high': return '#991b1b';
        default: return '#e4e1e5';
    }
}

function updateTable(readings) {
    const pageLength = getAppropriatePageLength();
    const t = translations[currentLanguage];
    
    if (!readingsTable) {
        readingsTable = $('#readings-table').DataTable({
            data: readings,
            columns: [
                { data: 'timestamp' },
                { 
                    data: 'value', 
                    render: (data, type, row) => {
                        if (type === 'display') {
                            return data.toFixed(1);
                        }
                        return data;
                    } 
                },
                { data: 'unit' }
            ],
            createdRow: function(row, data, dataIndex) {
                const range = getGlucoseRange(data.value, data.unit);
                $(row).addClass(`reading-${range}`);
            },
            order: [[0, 'desc']],
            pageLength: pageLength,
            dom: 'ftp', 
            language: {
                search: "",
                searchPlaceholder: t.search_placeholder
            }
        });
    } else {
        readingsTable.clear().rows.add(readings).page.len(pageLength).draw();
    }
}

function renderChart(readings) {
    const t = translations[currentLanguage];
    if (!glucoseChart) {
        const chartEl = document.getElementById('glucoseChart');
        if (!chartEl) return;
        glucoseChart = echarts.init(chartEl, 'dark', { renderer: 'canvas' });
        
        glucoseChart.on('dataZoom', function () {
            const axis = glucoseChart.getModel().getComponent('xAxis', 0).axis;
            const range = axis.scale.getExtent();
            
            const filtered = allReadings.filter(r => {
                const t = new Date(r.timestamp).getTime();
                return t >= range[0] && t <= range[1];
            });
            
            updateTable(filtered);
        });
    }

    const chartData = readings.map(r => [new Date(r.timestamp), r.value]);
    const unit = readings.length > 0 ? readings[0].unit : 'mg/dL';
    
    const isMmol = (unit === 'mmol/L');
    const thresholds = isMmol ? 
        { low: 3.9, target: 7.8, caution: 10.0, high: 13.9 } : 
        { low: 70, target: 140, caution: 180, high: 250 };

    const pieces = [
        { gt: 0, lte: thresholds.low, color: '#ef4444' },
        { gt: thresholds.low, lte: thresholds.target, color: '#22c55e' },
        { gt: thresholds.target, lte: thresholds.caution, color: '#f59e0b' },
        { gt: thresholds.caution, lte: thresholds.high, color: '#ef4444' },
        { gt: thresholds.high, color: '#991b1b' }
    ];

    const option = {
        backgroundColor: 'transparent',
        tooltip: { 
            trigger: 'axis',
            formatter: function(params) {
                const p = params[0];
                const date = new Date(p.value[0]);
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const range = getGlucoseRange(p.value[1], unit);
                const label = getRangeLabel(range);
                const color = getRangeColor(range);
                return `${dateStr}<br/><span style="color:${color}">●</span> ${p.seriesName}: <b>${p.value[1].toFixed(1)}</b> ${unit} (${label})`;
            }
        },
        grid: {
            left: 45,
            right: 20,
            bottom: 60, 
            top: 15,
            containLabel: false
        },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            axisLine: { lineStyle: { color: '#27272a' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLine: { lineStyle: { color: '#27272a' } },
            splitLine: { lineStyle: { color: '#18181b' } }
        },
        visualMap: {
            show: false,
            dimension: 1,
            pieces: pieces
        },
        dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            {
                show: true,
                height: 20,
                bottom: 5,
                start: 0,
                end: 100,
                borderColor: '#27272a',
                fillerColor: 'rgba(59, 130, 246, 0.1)',
                handleStyle: { color: '#3b82f6' }
            }
        ],
        series: [
            {
                name: t.series_name,
                type: 'line',
                smooth: true,
                symbol: 'none',
                areaStyle: {
                    opacity: 0.1
                },
                lineStyle: { width: 3 },
                data: chartData,
                markArea: {
                    silent: true,
                    itemStyle: {
                        color: 'rgba(34, 197, 94, 0.05)'
                    },
                    data: [[
                        { yAxis: thresholds.low },
                        { yAxis: thresholds.target }
                    ]]
                }
            }
        ]
    };

    glucoseChart.setOption(option);
    setTimeout(() => {
        if (glucoseChart) glucoseChart.resize();
    }, 0);
}

window.addEventListener('resize', () => {
    if (glucoseChart) glucoseChart.resize();
    if (readingsTable) {
        const newLen = getAppropriatePageLength();
        if (readingsTable.page.len() !== newLen) {
            readingsTable.page.len(newLen).draw();
        }
    }
});

window.addEventListener('pywebviewready', () => {
    // Detect language
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.startsWith('ja')) {
        changeLanguage('ja');
    } else {
        changeLanguage('en');
    }
    loadData();
});

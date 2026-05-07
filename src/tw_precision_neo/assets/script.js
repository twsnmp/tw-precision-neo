let glucoseChart = null;
let statsChart = null;
let heatmapChart = null;
let readingsTable = null;
let allReadings = []; // Global store for original data

const translations = {
    en: {
        stats_btn: "Stats",
        heatmap_btn: "Heatmap",
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
        series_name: "Glucose Level",
        stats_title: "Blood Glucose Statistics",
        stats_series: "Reading Count",
        lbl_max: "Max",
        lbl_min: "Min",
        lbl_avg: "Average",
        lbl_median: "Median",
        lbl_stddev: "Std Dev",
        lbl_count: "Count",
        heatmap_title: "Glucose Heatmap (Day vs Hour)",
        metric_count: "Count",
        metric_average: "Average",
        days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        hours: ["12a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p"]
    },
    ja: {
        stats_btn: "統計",
        heatmap_btn: "ヒートマップ",
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
        series_name: "血糖値",
        stats_title: "血糖値統計 (範囲別)",
        stats_series: "測定回数",
        lbl_max: "最大値",
        lbl_min: "最小値",
        lbl_avg: "平均値",
        lbl_median: "中央値",
        lbl_stddev: "標準偏差",
        lbl_count: "測定数",
        heatmap_title: "時間帯別ヒートマップ",
        metric_count: "測定回数",
        metric_average: "平均値",
        days: ["日", "月", "火", "水", "木", "金", "土"],
        hours: ["0時", "1時", "2時", "3時", "4時", "5時", "6時", "7時", "8時", "9時", "10時", "11時", "12時", "13時", "14時", "15時", "16時", "17時", "18時", "19時", "20時", "21時", "22時", "23時"]
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
    const statsBtn = document.getElementById('stats-btn');
    if (statsBtn) statsBtn.innerText = t.stats_btn;

    const heatmapBtn = document.getElementById('heatmap-btn');
    if (heatmapBtn) heatmapBtn.innerText = t.heatmap_btn;

    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) syncBtn.innerText = t.sync_btn;
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.innerText = t.export_btn;
    
    const chartTitle = document.getElementById('chart-title');
    if (chartTitle) chartTitle.innerText = t.chart_title;

    const statsTitle = document.getElementById('stats-title');
    if (statsTitle) statsTitle.innerText = t.stats_title;

    const heatmapTitle = document.getElementById('heatmap-title');
    if (heatmapTitle) heatmapTitle.innerText = t.heatmap_title;
    
    const tableTitle = document.getElementById('table-title');
    if (tableTitle) tableTitle.innerText = t.table_title;
    
    const thTimestamp = document.getElementById('th-timestamp');
    if (thTimestamp) thTimestamp.innerText = t.th_timestamp;
    
    const thValue = document.getElementById('th-value');
    if (thValue) thValue.innerText = t.th_value;
    
    const thUnit = document.getElementById('th-unit');
    if (thUnit) thUnit.innerText = t.th_unit;

    // Heatmap metric selector
    const heatmapMetric = document.getElementById('heatmap-metric');
    if (heatmapMetric) {
        heatmapMetric.options[0].text = t.metric_count;
        heatmapMetric.options[1].text = t.metric_average;
    }

    // Detailed stats labels
    const lbls = ['max', 'min', 'avg', 'median', 'stddev', 'count'];
    lbls.forEach(l => {
        const el = document.getElementById(`lbl-${l}`);
        if (el) el.innerText = t[`lbl_${l}`];
    });
    
    const statusEl = document.getElementById('status');
    if (statusEl) {
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
    const statsBtn = document.getElementById('stats-btn');
    if (statsBtn) statsBtn.disabled = disabled;
    const heatmapBtn = document.getElementById('heatmap-btn');
    if (heatmapBtn) heatmapBtn.disabled = disabled;
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

function showStats() {
    const modal = document.getElementById('stats-modal');
    if (modal) {
        modal.style.display = 'block';
        renderStatsChart();
    }
}

function hideStats() {
    const modal = document.getElementById('stats-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showHeatmap() {
    const modal = document.getElementById('heatmap-modal');
    if (modal) {
        modal.style.display = 'block';
        renderHeatmap();
    }
}

function hideHeatmap() {
    const modal = document.getElementById('heatmap-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function renderStatsChart() {
    const t = translations[currentLanguage];
    const chartEl = document.getElementById('statsChart');
    if (!chartEl) return;
    
    if (!statsChart) {
        statsChart = echarts.init(chartEl, 'dark', { renderer: 'canvas' });
    }

    let readingsToProcess = allReadings;
    if (readingsTable) {
        readingsToProcess = readingsTable.rows({ search: 'applied' }).data().toArray();
    }

    if (readingsToProcess.length === 0) {
        const ids = ['max', 'min', 'avg', 'median', 'stddev', 'count'];
        ids.forEach(id => {
            const el = document.getElementById(`val-${id}`);
            if (el) el.innerText = '--';
        });
        document.getElementById('time-max').innerText = '--';
        document.getElementById('time-min').innerText = '--';
        if (statsChart) statsChart.clear();
        return;
    }

    const counts = { 'low': 0, 'target': 0, 'caution': 0, 'high': 0, 'very-high': 0 };
    const values = readingsToProcess.map(r => r.value);
    const unit = readingsToProcess[0].unit;
    
    let maxReading = readingsToProcess[0];
    let minReading = readingsToProcess[0];
    let sum = 0;

    readingsToProcess.forEach(r => {
        const range = getGlucoseRange(r.value, r.unit);
        if (counts.hasOwnProperty(range)) counts[range]++;
        
        if (r.value > maxReading.value) maxReading = r;
        if (r.value < minReading.value) minReading = r;
        sum += r.value;
    });

    const avg = sum / readingsToProcess.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sortedValues.length / 2);
    const median = sortedValues.length % 2 !== 0 ? sortedValues[mid] : (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    document.getElementById('val-max').innerText = `${maxReading.value.toFixed(1)} ${unit}`;
    document.getElementById('time-max').innerText = formatDate(maxReading.timestamp);
    document.getElementById('val-min').innerText = `${minReading.value.toFixed(1)} ${unit}`;
    document.getElementById('time-min').innerText = formatDate(minReading.timestamp);
    document.getElementById('val-avg').innerText = `${avg.toFixed(1)} ${unit}`;
    document.getElementById('val-median').innerText = `${median.toFixed(1)} ${unit}`;
    document.getElementById('val-stddev').innerText = `${stdDev.toFixed(1)} ${unit}`;
    document.getElementById('val-count').innerText = readingsToProcess.length;

    const pieData = Object.keys(counts).map(key => {
        return {
            name: getRangeLabel(key),
            value: counts[key],
            itemStyle: { color: getRangeColor(key) }
        };
    }).filter(d => d.value > 0);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            formatter: '{b}: <b>{c}</b> ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            textStyle: { color: '#c8c5ca' }
        },
        series: [
            {
                name: t.stats_series,
                type: 'pie',
                radius: '60%',
                center: ['50%', '50%'],
                data: pieData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                label: {
                    show: true,
                    color: '#c8c5ca',
                    formatter: '{b}: {d}%'
                }
            }
        ]
    };

    statsChart.setOption(option);
    setTimeout(() => {
        if (statsChart) statsChart.resize();
    }, 0);
}

function renderHeatmap() {
    const t = translations[currentLanguage];
    const chartEl = document.getElementById('heatmapChart');
    if (!chartEl) return;
    
    if (!heatmapChart) {
        heatmapChart = echarts.init(chartEl, 'dark', { renderer: 'canvas' });
    }

    let readingsToProcess = allReadings;
    if (readingsTable) {
        readingsToProcess = readingsTable.rows({ search: 'applied' }).data().toArray();
    }

    const metric = document.getElementById('heatmap-metric').value; // 'count' or 'average'
    const unit = readingsToProcess.length > 0 ? readingsToProcess[0].unit : '';

    // Initialize 24x7 grid
    const grid = [];
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            grid.push([hour, day, { sum: 0, count: 0 }]);
        }
    }

    readingsToProcess.forEach(r => {
        const date = new Date(r.timestamp);
        const day = date.getDay();
        const hour = date.getHours();
        const idx = day * 24 + hour;
        grid[idx][2].sum += r.value;
        grid[idx][2].count++;
    });

    const data = grid.map(item => {
        const valObj = item[2];
        let value = 0;
        if (metric === 'count') {
            value = valObj.count;
        } else {
            value = valObj.count > 0 ? valObj.sum / valObj.count : 0;
        }
        return [item[0], item[1], value || '-'];
    });

    const maxVal = Math.max(...data.map(d => typeof d[2] === 'number' ? d[2] : 0)) || 1;

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            position: 'top',
            formatter: (params) => {
                const hour = t.hours[params.data[0]];
                const day = t.days[params.data[1]];
                const val = params.data[2];
                const label = metric === 'count' ? t.metric_count : t.metric_average;
                const formattedVal = typeof val === 'number' ? (metric === 'count' ? val : val.toFixed(1) + ' ' + unit) : '--';
                return `${day} ${hour}<br/>${label}: <b>${formattedVal}</b>`;
            }
        },
        grid: {
            height: '70%',
            top: '10%',
            left: '10%',
            right: '5%'
        },
        xAxis: {
            type: 'category',
            data: t.hours,
            splitArea: { show: true },
            axisLabel: { interval: 1 }
        },
        yAxis: {
            type: 'category',
            data: t.days,
            splitArea: { show: true }
        },
        visualMap: {
            min: 0,
            max: maxVal,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            inRange: {
                color: metric === 'count' ? ['#18181b', '#3b82f6'] : ['#22c55e', '#f59e0b', '#ef4444']
            },
            textStyle: { color: '#c8c5ca' }
        },
        series: [{
            name: 'Glucose Heatmap',
            type: 'heatmap',
            data: data,
            label: {
                show: false
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };

    heatmapChart.setOption(option);
    setTimeout(() => {
        if (heatmapChart) heatmapChart.resize();
    }, 0);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const statsModal = document.getElementById('stats-modal');
    const heatmapModal = document.getElementById('heatmap-modal');
    if (event.target == statsModal) hideStats();
    if (event.target == heatmapModal) hideHeatmap();
}

window.addEventListener('resize', () => {
    if (glucoseChart) glucoseChart.resize();
    if (statsChart) statsChart.resize();
    if (heatmapChart) heatmapChart.resize();
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

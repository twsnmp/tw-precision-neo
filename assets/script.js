let glucoseChart = null;
let readingsTable = null;
let allReadings = []; // Global store for original data

async function syncDevice() {
    updateStatus('Syncing...');
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
    
    // Get currently filtered rows from DataTable
    const visibleData = readingsTable.rows({ search: 'applied' }).data().toArray();
    
    if (visibleData.length === 0) {
        updateStatus('No data to export.');
        return;
    }

    updateStatus('Exporting...');
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
        allReadings = data.readings || []; // Store for filtering
        updateUI(data);
    } catch (e) {
        console.error('Failed to load data:', e);
    }
}

function updateStatus(msg) {
    document.getElementById('status').innerText = msg;
}

function setButtonsDisabled(disabled) {
    document.getElementById('sync-btn').disabled = disabled;
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
        // mg/dL
        if (value < 70) return 'low';
        if (value <= 140) return 'target';
        if (value <= 180) return 'caution';
        if (value <= 250) return 'high';
        return 'very-high';
    }
}

function getRangeLabel(range) {
    switch(range) {
        case 'low': return '低血糖';
        case 'target': return '目標範囲内';
        case 'caution': return '高め (注意)';
        case 'high': return '高血糖';
        case 'very-high': return '非常に高い';
        default: return '不明';
    }
}

function getRangeColor(range) {
    switch(range) {
        case 'low': return '#ef4444';       // Red
        case 'target': return '#22c55e';    // Green
        case 'caution': return '#f59e0b';   // Orange/Yellow
        case 'high': return '#ef4444';      // Red
        case 'very-high': return '#991b1b'; // Dark Red
        default: return '#e4e1e5';
    }
}

function updateTable(readings) {
    const pageLength = getAppropriatePageLength();
    
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
                searchPlaceholder: "フィルタ..."
            }
        });
    } else {
        readingsTable.clear().rows.add(readings).page.len(pageLength).draw();
    }
}

function renderChart(readings) {
    if (!glucoseChart) {
        glucoseChart = echarts.init(document.getElementById('glucoseChart'), 'dark', { renderer: 'canvas' });
        
        // Listen for dataZoom events to filter the table
        glucoseChart.on('dataZoom', function () {
            const axis = glucoseChart.getModel().getComponent('xAxis', 0).axis;
            const range = axis.scale.getExtent(); // [minTimestamp, maxTimestamp]
            
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
        { gt: 0, lte: thresholds.low, color: '#ef4444' },               // Low: Red
        { gt: thresholds.low, lte: thresholds.target, color: '#22c55e' }, // Target: Green
        { gt: thresholds.target, lte: thresholds.caution, color: '#f59e0b' }, // Caution: Orange
        { gt: thresholds.caution, lte: thresholds.high, color: '#ef4444' }, // High: Red
        { gt: thresholds.high, color: '#991b1b' }                      // Very High: Dark Red
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
                name: '血糖値',
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
    // Explicitly trigger resize after setting options to ensure flex container size is picked up
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
    loadData();
});

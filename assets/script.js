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

function updateTable(readings) {
    const pageLength = getAppropriatePageLength();
    
    if (!readingsTable) {
        readingsTable = $('#readings-table').DataTable({
            data: readings,
            columns: [
                { data: 'timestamp' },
                { data: 'value', render: (data) => data.toFixed(1) },
                { data: 'unit' }
            ],
            order: [[0, 'desc']],
            pageLength: pageLength,
            dom: 'ftp', 
            language: {
                search: "",
                searchPlaceholder: "Filter..."
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

    const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
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
                name: 'Blood Glucose',
                type: 'line',
                smooth: true,
                symbol: 'none',
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
                        { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
                    ])
                },
                lineStyle: { color: '#3b82f6', width: 2 },
                data: chartData
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

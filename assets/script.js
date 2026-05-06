let glucoseChart = null;
let readingsTable = null;

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

async function loadData() {
    try {
        const data = await pywebview.api.get_data();
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

let glucoseChart = null;

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

async function importCSV() {
    updateStatus('Importing CSV...');
    setButtonsDisabled(true);
    try {
        const result = await pywebview.api.import_csv();
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
    document.getElementById('import-btn').disabled = disabled;
}

function updateUI(data) {
    // Update TIR
    document.getElementById('tir-value').innerText = data.tir.in_range.toFixed(1) + '%';
    
    // Update Table
    const tbody = document.querySelector('#readings-table tbody');
    tbody.innerHTML = '';
    data.readings.slice(-10).reverse().forEach(r => {
        const row = `<tr><td>${r.timestamp}</td><td>${r.value.toFixed(1)}</td><td>${r.unit}</td></tr>`;
        tbody.innerHTML += row;
    });

    // Update Chart
    renderChart(data.readings);
}

function renderChart(readings) {
    const ctx = document.getElementById('glucoseChart').getContext('2d');
    
    if (glucoseChart) {
        glucoseChart.destroy();
    }

    glucoseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: readings.map(r => r.timestamp),
            datasets: [{
                label: 'Blood Glucose',
                data: readings.map(r => r.value),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.2, // Clinical: less smooth, more precise
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#3b82f6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: { 
                        display: true, 
                        text: 'mg/dL',
                        color: '#c8c5ca',
                        font: { family: 'Inter', size: 11, weight: '600' }
                    },
                    grid: {
                        color: '#18181b', // Match surface color for grid
                        drawBorder: false
                    },
                    ticks: {
                        color: '#c8c5ca',
                        font: { family: 'monospace', size: 11 },
                        padding: 8
                    }
                },
                x: {
                    display: false,
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#18181b',
                    titleColor: '#e4e1e5',
                    bodyColor: '#e4e1e5',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    cornerRadius: 4,
                    padding: 10,
                    titleFont: { family: 'Inter', size: 12 },
                    bodyFont: { family: 'monospace', size: 12 },
                    usePointStyle: true
                }
            }
        }
    });
}

// Initial load
window.addEventListener('pywebviewready', () => {
    loadData();
});

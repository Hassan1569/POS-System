// Dashboard-specific functions

// Calculate dashboard statistics
function calculateDashboardStats() {
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    const sales = Storage.get(STORAGE_KEYS.SALES, []);
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, {});
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let stats = {
        totalProducts: products.length,
        totalStock: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        expiringCount: 0,
        expiredCount: 0,
        todaySales: 0,
        todayRevenue: 0,
        inventoryValue: 0,
        productsAddedThisMonth: 0
    };
    
    // Calculate product stats
    products.forEach(product => {
        let totalProductStock = 0;
        let validProductStock = 0;
        let hasExpired = false;
        let isExpiringSoon = false;
        
        product.batches.forEach(batch => {
            totalProductStock += Number(batch.quantity) || 0;
            if (Utils.calculateExpiryStatus(batch.expiryDate).status !== 'EXPIRED') validProductStock += Number(batch.quantity) || 0;
            stats.totalStock += Number(batch.quantity) || 0;
            stats.inventoryValue += batch.quantity * batch.purchasePrice;
            
            const expiryDate = new Date(batch.expiryDate);
            const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry < 0) {
                hasExpired = true;
            } else if (daysUntilExpiry <= (settings.expiryWarningDays || 30)) {
                isExpiringSoon = true;
            }
        });
        
        if (hasExpired) {
            stats.expiredCount++;
        } else if (isExpiringSoon) {
            stats.expiringCount++;
        }
        
        if (validProductStock === 0) {
            stats.outOfStockCount = (stats.outOfStockCount || 0) + 1;
        } else if (validProductStock <= product.reorderLevel) {
            stats.lowStockCount++;
        }
        
        // Check if added this month
        const createdDate = new Date(product.createdAt);
        if (createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()) {
            stats.productsAddedThisMonth++;
        }
    });
    
    // Calculate today's sales
    sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate >= todayStart) {
            stats.todaySales++;
            stats.todayRevenue += Number(sale.grandTotal) || 0;
        }
    });
    
    return stats;
}

// Update dashboard statistics
function updateDashboardStats() {
    const stats = calculateDashboardStats();
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, {});
    const currencySymbol = settings.currencySymbol || '$';
    
    // Update stat cards
    document.getElementById('totalProducts').textContent = stats.totalProducts;
    document.getElementById('totalStock').textContent = stats.totalStock.toLocaleString();
    document.getElementById('lowStockCount').textContent = stats.lowStockCount;
    document.getElementById('expiringCount').textContent = stats.expiringCount;
    document.getElementById('expiredCount').textContent = stats.expiredCount;
    document.getElementById('todaySales').textContent = stats.todaySales;
    document.getElementById('todayRevenue').textContent = currencySymbol + stats.todayRevenue.toFixed(2);
    document.getElementById('inventoryValue').textContent = currencySymbol + stats.inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('productsChange').textContent = stats.productsAddedThisMonth;
}

// Load recent sales
function loadRecentSales() {
    const sales = Storage.get(STORAGE_KEYS.SALES, []);
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, {});
    const currencySymbol = settings.currencySymbol || '$';
    const recentSalesList = document.getElementById('recentSalesList');
    
    if (!recentSalesList) return;
    
    // Sort by date and get last 10
    const recentSales = sales.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    
    if (recentSales.length === 0) {
        recentSalesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h4>No Sales Yet</h4>
                <p>Recent sales will appear here</p>
            </div>
        `;
        return;
    }
    
    recentSalesList.innerHTML = recentSales.map(sale => {
        const saleDate = new Date(sale.date);
        const timeAgo = getTimeAgo(saleDate);
        
        return `
            <div class="recent-sale-item">
                <div class="recent-sale-info">
                    <h6>${sale.invoiceNumber}</h6>
                    <small><i class="fas fa-user me-1"></i>${sale.customer?.name || sale.customerName || 'Walk-in Customer'}</small>
                    <small class="d-block"><i class="fas fa-clock me-1"></i>${timeAgo}</small>
                </div>
                <div class="recent-sale-amount">
                    ${currencySymbol}${sale.grandTotal.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
}

// Time ago helper
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Sales Chart
let salesChart = null;
let currentSalesPeriod = 'daily';

function initializeSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    const data = getSalesChartData(currentSalesPeriod);
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Sales',
                data: data.values,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

function getSalesChartData(period) {
    const sales = Storage.get(STORAGE_KEYS.SALES, []);
    const now = new Date();
    
    if (period === 'daily') {
        // Last 7 days
        const labels = [];
        const values = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            labels.push(dateStr);
            
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            
            const daySales = sales.filter(s => {
                const saleDate = new Date(s.date);
                return saleDate >= dayStart && saleDate < dayEnd;
            });
            
            const total = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
            values.push(total);
        }
        
        return { labels, values };
    } else if (period === 'weekly') {
        // Last 8 weeks
        const labels = [];
        const values = [];
        
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            labels.push(`Week ${8 - i}`);
            
            const weekSales = sales.filter(s => {
                const saleDate = new Date(s.date);
                return saleDate >= weekStart && saleDate < weekEnd;
            });
            
            const total = weekSales.reduce((sum, s) => sum + s.grandTotal, 0);
            values.push(total);
        }
        
        return { labels, values };
    } else {
        // Last 6 months
        const labels = [];
        const values = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
            labels.push(monthStr);
            
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthSales = sales.filter(s => {
                const saleDate = new Date(s.date);
                return saleDate >= monthStart && saleDate <= monthEnd;
            });
            
            const total = monthSales.reduce((sum, s) => sum + s.grandTotal, 0);
            values.push(total);
        }
        
        return { labels, values };
    }
}

function changeSalesPeriod(period) {
    currentSalesPeriod = period;
    
    // Update button states
    document.querySelectorAll('.chart-period-selector .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    initializeSalesChart();
}

// Inventory Status Chart
let inventoryChart = null;

function initializeInventoryChart() {
    const ctx = document.getElementById('inventoryChart');
    if (!ctx) return;
    
    if (inventoryChart) {
        inventoryChart.destroy();
    }
    
    const stats = calculateDashboardStats();
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    
    const healthyStock = products.length - stats.lowStockCount - stats.expiringCount - stats.expiredCount;
    
    inventoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Healthy Stock', 'Low Stock', 'Expiring Soon', 'Expired'],
            datasets: [{
                data: [healthyStock, stats.lowStockCount, stats.expiringCount, stats.expiredCount],
                backgroundColor: [
                    '#10b981',
                    '#f59e0b',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Category Distribution Chart
let categoryChart = null;

function initializeCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    const categoryCount = {};
    
    products.forEach(product => {
        categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
    });
    
    const sortedCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Top 8 categories
    
    const labels = sortedCategories.map(([cat]) => cat);
    const values = sortedCategories.map(([, count]) => count);
    
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6'
    ];
    
    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Products',
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('dashboard')) return;
    
    updateDashboardStats();
    loadRecentSales();
    
    // Initialize charts
    setTimeout(() => {
        initializeSalesChart();
        initializeInventoryChart();
        initializeCategoryChart();
    }, 100);
});

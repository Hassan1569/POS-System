/**
 * PharmaCare - Core Application Framework
 * Handles Auth, Role Authorization, Dynamic Navigation, Notifications, and App Initialization.
 */

// Authentication and Authorization Check
function checkAuth() {
    const rawUser = localStorage.getItem('pharmacy_current_user');
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('login.html');
    
    if (!rawUser) {
        if (!isLoginPage && window.location.pathname !== '/' && window.location.pathname !== '') {
            window.location.href = 'index.html';
            return null;
        }
        return null;
    }

    let currentUser = null;
    try {
        currentUser = JSON.parse(rawUser);
    } catch (e) {
        console.error('Invalid user session in storage', e);
        Storage?.remove?.(STORAGE_KEYS.CURRENT_USER) || localStorage.removeItem('pharmacy_current_user');
        if (!isLoginPage) window.location.href = 'index.html';
        return null;
    }

    // Role-based route guard
    enforceRoleAccess(currentUser);

    return currentUser;
}

// Enforce role-based access control on restricted pages
function enforceRoleAccess(user) {
    if (!user) return;
    
    const adminOnlyPages = [
        'users.html',
        'settings.html',
        'reports.html',
        'categories.html',
        'add-product.html'
    ];

    const currentPath = window.location.pathname;
    const isRestricted = adminOnlyPages.some(page => currentPath.endsWith(page));

    if (isRestricted && user.role !== 'admin') {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'You do not have administrative permissions to view this page.',
            confirmButtonColor: '#3b82f6'
        }).then(() => {
            window.location.href = 'dashboard.html';
        });
    }
}

// User logout
function logout() {
    Swal.fire({
        title: 'Logout Confirmation',
        text: 'Are you sure you want to end your current session?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, logout'
    }).then((result) => {
        if (result.isConfirmed) {
            Storage?.remove?.(STORAGE_KEYS.CURRENT_USER) || localStorage.removeItem('pharmacy_current_user');
            window.location.href = 'index.html';
        }
    });
}

// Generate Role-Based Sidebar Navigation
function generateSidebarMenu() {
    const rawUser = localStorage.getItem('pharmacy_current_user');
    if (!rawUser) return;

    let user = null;
    try {
        user = JSON.parse(rawUser);
    } catch (e) {
        return;
    }

    const menuContainer = document.getElementById('sidebarMenu');
    if (!menuContainer) return;

    const currentPath = window.location.pathname;
    
    // Accurate page active detection
    const isActive = (pageName) => {
        if (pageName === 'dashboard') {
            return currentPath.endsWith('dashboard.html') || 
                   currentPath === '/' || 
                   currentPath.endsWith('/');
        }
        return currentPath.endsWith(pageName);
    };

    const isAdmin = user.role === 'admin';

    let menuHTML = `
        <!-- Dashboard Section -->
        <div class="menu-section">
            <a href="dashboard.html" class="menu-item ${isActive('dashboard') ? 'active' : ''}">
                <i class="fas fa-chart-line"></i>
                <span>Dashboard</span>
            </a>
        </div>

        <!-- Inventory Section -->
        <div class="menu-section">
            <div class="menu-section-title">Inventory</div>
            <a href="products.html" class="menu-item ${isActive('products.html') ? 'active' : ''}">
                <i class="fas fa-pills"></i>
                <span>All Products</span>
            </a>
            ${isAdmin ? `
            <a href="add-product.html" class="menu-item ${isActive('add-product.html') ? 'active' : ''}">
                <i class="fas fa-plus-circle"></i>
                <span>Add Product</span>
            </a>
            ` : ''}
            <a href="inventory.html" class="menu-item ${isActive('inventory.html') ? 'active' : ''}">
                <i class="fas fa-boxes"></i>
                <span>Stock Overview</span>
            </a>
            <a href="low-stock.html" class="menu-item ${isActive('low-stock.html') ? 'active' : ''}">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Low Stock</span>
            </a>
            <a href="expiring-products.html" class="menu-item ${isActive('expiring-products.html') ? 'active' : ''}">
                <i class="fas fa-clock"></i>
                <span>Expiring Soon</span>
            </a>
            <a href="expired-products.html" class="menu-item ${isActive('expired-products.html') ? 'active' : ''}">
                <i class="fas fa-ban"></i>
                <span>Expired Products</span>
            </a>
            ${isAdmin ? `
            <a href="categories.html" class="menu-item ${isActive('categories.html') ? 'active' : ''}">
                <i class="fas fa-tags"></i>
                <span>Categories</span>
            </a>
            ` : ''}
        </div>

        <!-- Sales & POS Section -->
        <div class="menu-section">
            <div class="menu-section-title">Sales & Billing</div>
            <a href="pos.html" class="menu-item ${isActive('pos.html') ? 'active' : ''}">
                <i class="fas fa-cash-register"></i>
                <span>POS / Billing</span>
            </a>
            <a href="sales.html" class="menu-item ${isActive('sales.html') ? 'active' : ''}">
                <i class="fas fa-receipt"></i>
                <span>Sales History</span>
            </a>
            ${isAdmin ? `
            <a href="reports.html" class="menu-item ${isActive('reports.html') ? 'active' : ''}">
                <i class="fas fa-chart-bar"></i>
                <span>Reports & Analytics</span>
            </a>
            ` : ''}
        </div>
    `;

    if (isAdmin) {
        menuHTML += `
            <!-- Management Section -->
            <div class="menu-section">
                <div class="menu-section-title">Administration</div>
                <a href="users.html" class="menu-item ${isActive('users.html') ? 'active' : ''}">
                    <i class="fas fa-users-cog"></i>
                    <span>User Accounts</span>
                </a>
                <a href="settings.html" class="menu-item ${isActive('settings.html') ? 'active' : ''}">
                    <i class="fas fa-sliders-h"></i>
                    <span>System Settings</span>
                </a>
            </div>
        `;
    }

    menuContainer.innerHTML = menuHTML;
}

// Update User Profile Information in Topbar
function updateUserInfo() {
    const rawUser = localStorage.getItem('pharmacy_current_user');
    if (!rawUser) return;

    let user = null;
    try {
        user = JSON.parse(rawUser);
    } catch (e) {
        return;
    }

    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');

    if (userNameEl) userNameEl.textContent = user.name || 'User';
    if (userRoleEl) {
        userRoleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Shopkeeper / Cashier';
    }
}

// Generate Real-time Notification Badges and Dropdown Items
function generateNotifications() {
    if (typeof Storage === 'undefined' || typeof Utils === 'undefined') return;

    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, {});
    const notifications = [];

    const criticalDays = Number(settings.criticalExpiryDays) || 7;
    const warningDays = Number(settings.expiryWarningDays) || 30;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    products.forEach(product => {
        let totalProductStock = 0;
        let validProductStock = 0;

        if (Array.isArray(product.batches)) {
            product.batches.forEach(batch => {
                const qty = Number(batch.quantity) || 0;
                totalProductStock += qty;

                const expiryStatus = Utils.calculateExpiryStatus(batch.expiryDate, warningDays, criticalDays);
                if (expiryStatus.status !== 'EXPIRED') validProductStock += qty;

                if (expiryStatus.status === 'EXPIRED' && qty > 0) {
                    notifications.push({
                        type: 'danger',
                        icon: 'fa-ban',
                        title: 'Expired Batch',
                        message: `${product.name} (Batch: ${batch.batchNumber}) expired ${expiryStatus.daysExpired}d ago`,
                        time: 'Action Required',
                        link: 'expired-products.html'
                    });
                } else if (expiryStatus.status === 'CRITICAL' && qty > 0) {
                    notifications.push({
                        type: 'danger',
                        icon: 'fa-exclamation-triangle',
                        title: 'Critical Expiry',
                        message: `${product.name} (Batch: ${batch.batchNumber}) expires in ${expiryStatus.daysRemaining} days`,
                        time: 'Urgent',
                        link: 'expiring-products.html'
                    });
                } else if (expiryStatus.status === 'WARNING' && qty > 0) {
                    notifications.push({
                        type: 'warning',
                        icon: 'fa-clock',
                        title: 'Expiring Soon',
                        message: `${product.name} expires in ${expiryStatus.daysRemaining} days`,
                        time: 'Warning',
                        link: 'expiring-products.html'
                    });
                }
            });
        }

        const reorderLevel = Number(product.reorderLevel) || 20;

        if (validProductStock === 0) {
            notifications.push({
                type: 'danger',
                icon: 'fa-times-circle',
                title: 'Out of Stock',
                message: `${product.name} has zero available stock units`,
                time: 'Immediate',
                link: 'low-stock.html'
            });
        } else if (validProductStock <= reorderLevel) {
            notifications.push({
                type: 'warning',
                icon: 'fa-exclamation-circle',
                title: 'Low Stock Alert',
                message: `${product.name} has ${validProductStock} valid units (Reorder: ${reorderLevel})`,
                time: 'Reorder',
                link: 'low-stock.html'
            });
        }
    });

    // Update notification badge
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = notifications.length;
        badge.style.display = notifications.length > 0 ? 'inline-block' : 'none';
    }

    // Update notification list container
    const listEl = document.getElementById('notificationList');
    if (listEl) {
        if (notifications.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state" style="padding: 25px 15px;">
                    <i class="fas fa-check-circle" style="font-size: 32px; color: #10b981; margin-bottom: 10px;"></i>
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">All inventory stocks and expiries are healthy.</p>
                </div>
            `;
        } else {
            // Show up to 8 notifications
            const itemsToShow = notifications.slice(0, 8);
            listEl.innerHTML = itemsToShow.map(n => `
                <a href="${n.link || '#'}" class="notification-item text-decoration-none text-dark d-block">
                    <div class="notification-item-header">
                        <div class="notification-item-title">
                            <i class="fas ${n.icon} text-${n.type} me-2"></i>
                            <strong>${n.title}</strong>
                        </div>
                        <span class="notification-item-time badge bg-${n.type}">${n.time}</span>
                    </div>
                    <div class="notification-item-message text-muted small">${n.message}</div>
                </a>
            `).join('');
        }
    }
}

// Mobile & Desktop Sidebar Toggle Handler
function initializeSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
                if (mainContent) mainContent.classList.toggle('expanded');
            }
        });
    }

    // Auto-close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && sidebarToggle && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// Sidebar Structure Validator
function initializeSidebarStructure() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    let menuContainer = document.getElementById('sidebarMenu');
    if (!menuContainer) {
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <i class="fas fa-prescription-bottle-alt"></i>
                <span>PharmaCare</span>
            </div>
            <div class="sidebar-menu" id="sidebarMenu"></div>
        `;
    }
}

// Automatic bootstrap on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // 1. Ensure Storage is initialized with full datasets
    if (typeof Storage !== 'undefined') {
        Storage.init();
    }

    // 2. Authenticate
    checkAuth();

    // 3. Initialize sidebar and topbar
    initializeSidebarStructure();
    generateSidebarMenu();
    updateUserInfo();
    generateNotifications();
    initializeSidebarToggle();
});

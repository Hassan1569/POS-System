// Core Application Functions and Utilities

// Check authentication
function checkAuth() {
    const currentUser = localStorage.getItem('pharmacy_current_user');
    if (!currentUser && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.location.href = 'index.html';
        return null;
    }
    return currentUser ? JSON.parse(currentUser) : null;
}

// Initialize app with sample data
function initializeAppData() {
    // Check if already initialized
    if (localStorage.getItem('pharmacy_data_initialized')) {
        return;
    }

    // Categories
    const categories = [
        'Prescription Medicines',
        'OTC Medicines',
        'Antibiotics',
        'Pain Relief',
        'Fever & Cold',
        'Syrups',
        'Vitamins & Supplements',
        'Injections',
        'Diabetes Care',
        'Blood Pressure',
        'Skin Care',
        'Personal Care',
        'Baby Care',
        'Medical Devices',
        'First Aid',
        'Surgical Items',
        'Other'
    ];
    
    localStorage.setItem('pharmacy_categories', JSON.stringify(categories));

    // Sample Products with multiple batches
    const products = [
        {
            id: 1,
            name: 'Paracetamol 500mg',
            genericName: 'Paracetamol',
            brand: 'Panadol',
            sku: 'PCM-500',
            barcode: '1234567890001',
            category: 'Pain Relief',
            type: 'Tablet',
            manufacturer: 'GSK',
            description: 'Pain and fever relief medication',
            prescriptionRequired: false,
            supplier: 'MediSupply Co.',
            supplierContact: '+1234567890',
            storageInstructions: 'Store at room temperature',
            batches: [
                {
                    batchNumber: 'PCM001',
                    quantity: 150,
                    purchasePrice: 80,
                    sellingPrice: 100,
                    mrp: 120,
                    tax: 5,
                    manufacturingDate: '2024-01-15',
                    expiryDate: '2026-10-15',
                    unit: 'Strip'
                },
                {
                    batchNumber: 'PCM002',
                    quantity: 200,
                    purchasePrice: 85,
                    sellingPrice: 105,
                    mrp: 125,
                    tax: 5,
                    manufacturingDate: '2024-06-10',
                    expiryDate: '2027-06-10',
                    unit: 'Strip'
                }
            ],
            minStock: 50,
            reorderLevel: 100,
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 2,
            name: 'Amoxicillin 250mg',
            genericName: 'Amoxicillin',
            brand: 'Amoxil',
            sku: 'AMX-250',
            barcode: '1234567890002',
            category: 'Antibiotics',
            type: 'Capsule',
            manufacturer: 'PharmaCorp',
            description: 'Antibiotic for bacterial infections',
            prescriptionRequired: true,
            supplier: 'HealthMed Supplies',
            supplierContact: '+1234567891',
            storageInstructions: 'Store in cool, dry place',
            batches: [
                {
                    batchNumber: 'AMX001',
                    quantity: 80,
                    purchasePrice: 150,
                    sellingPrice: 180,
                    mrp: 200,
                    tax: 5,
                    manufacturingDate: '2024-03-20',
                    expiryDate: '2026-03-20',
                    unit: 'Strip'
                }
            ],
            minStock: 30,
            reorderLevel: 60,
            createdAt: new Date('2024-02-15').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 3,
            name: 'Vitamin C 1000mg',
            genericName: 'Ascorbic Acid',
            brand: 'VitaBoost',
            sku: 'VTC-1000',
            barcode: '1234567890003',
            category: 'Vitamins & Supplements',
            type: 'Tablet',
            manufacturer: 'NutriPharma',
            description: 'Immune system support supplement',
            prescriptionRequired: false,
            supplier: 'Wellness Distributors',
            supplierContact: '+1234567892',
            storageInstructions: 'Store at room temperature',
            batches: [
                {
                    batchNumber: 'VTC001',
                    quantity: 250,
                    purchasePrice: 400,
                    sellingPrice: 500,
                    mrp: 550,
                    tax: 5,
                    manufacturingDate: '2024-05-01',
                    expiryDate: '2027-05-01',
                    unit: 'Bottle'
                }
            ],
            minStock: 40,
            reorderLevel: 80,
            createdAt: new Date('2024-03-10').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 4,
            name: 'Ibuprofen 400mg',
            genericName: 'Ibuprofen',
            brand: 'Brufen',
            sku: 'IBU-400',
            barcode: '1234567890004',
            category: 'Pain Relief',
            type: 'Tablet',
            manufacturer: 'Abbott',
            description: 'Anti-inflammatory pain relief',
            prescriptionRequired: false,
            supplier: 'MediSupply Co.',
            supplierContact: '+1234567890',
            storageInstructions: 'Store at room temperature',
            batches: [
                {
                    batchNumber: 'IBU001',
                    quantity: 30,
                    purchasePrice: 120,
                    sellingPrice: 150,
                    mrp: 170,
                    tax: 5,
                    manufacturingDate: '2024-01-10',
                    expiryDate: '2026-11-25',
                    unit: 'Strip'
                }
            ],
            minStock: 50,
            reorderLevel: 80,
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 5,
            name: 'Cough Syrup',
            genericName: 'Dextromethorphan',
            brand: 'CoughRelief',
            sku: 'CSY-100',
            barcode: '1234567890005',
            category: 'Syrups',
            type: 'Syrup',
            manufacturer: 'MediCare',
            description: 'Cough suppressant syrup',
            prescriptionRequired: false,
            supplier: 'HealthMed Supplies',
            supplierContact: '+1234567891',
            storageInstructions: 'Store in cool place',
            batches: [
                {
                    batchNumber: 'CSY001',
                    quantity: 15,
                    purchasePrice: 180,
                    sellingPrice: 220,
                    mrp: 250,
                    tax: 5,
                    manufacturingDate: '2024-02-15',
                    expiryDate: '2026-08-15',
                    unit: 'Bottle'
                }
            ],
            minStock: 20,
            reorderLevel: 40,
            createdAt: new Date('2024-02-20').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 6,
            name: 'Insulin Glargine',
            genericName: 'Insulin Glargine',
            brand: 'Lantus',
            sku: 'INS-100',
            barcode: '1234567890006',
            category: 'Diabetes Care',
            type: 'Injection',
            manufacturer: 'Sanofi',
            description: 'Long-acting insulin',
            prescriptionRequired: true,
            supplier: 'Specialty Meds',
            supplierContact: '+1234567893',
            storageInstructions: 'Refrigerate, do not freeze',
            batches: [
                {
                    batchNumber: 'INS001',
                    quantity: 25,
                    purchasePrice: 2500,
                    sellingPrice: 3000,
                    mrp: 3200,
                    tax: 5,
                    manufacturingDate: '2024-04-01',
                    expiryDate: '2026-04-01',
                    unit: 'Vial'
                }
            ],
            minStock: 10,
            reorderLevel: 20,
            createdAt: new Date('2024-04-05').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 7,
            name: 'Aspirin 75mg',
            genericName: 'Acetylsalicylic Acid',
            brand: 'Disprin',
            sku: 'ASP-75',
            barcode: '1234567890007',
            category: 'Blood Pressure',
            type: 'Tablet',
            manufacturer: 'Bayer',
            description: 'Blood thinner, heart health',
            prescriptionRequired: false,
            supplier: 'MediSupply Co.',
            supplierContact: '+1234567890',
            storageInstructions: 'Store at room temperature',
            batches: [
                {
                    batchNumber: 'ASP001',
                    quantity: 5,
                    purchasePrice: 90,
                    sellingPrice: 110,
                    mrp: 130,
                    tax: 5,
                    manufacturingDate: '2023-12-01',
                    expiryDate: '2025-12-31',
                    unit: 'Strip'
                }
            ],
            minStock: 40,
            reorderLevel: 70,
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 8,
            name: 'Hand Sanitizer 500ml',
            genericName: 'Ethyl Alcohol',
            brand: 'SafeHands',
            sku: 'SAN-500',
            barcode: '1234567890008',
            category: 'Personal Care',
            type: 'Liquid',
            manufacturer: 'HygieneCare',
            description: '70% alcohol hand sanitizer',
            prescriptionRequired: false,
            supplier: 'Wellness Distributors',
            supplierContact: '+1234567892',
            storageInstructions: 'Keep away from heat',
            batches: [
                {
                    batchNumber: 'SAN001',
                    quantity: 300,
                    purchasePrice: 200,
                    sellingPrice: 250,
                    mrp: 280,
                    tax: 5,
                    manufacturingDate: '2024-06-01',
                    expiryDate: '2027-06-01',
                    unit: 'Bottle'
                }
            ],
            minStock: 50,
            reorderLevel: 100,
            createdAt: new Date('2024-06-10').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 9,
            name: 'Digital Thermometer',
            genericName: 'Digital Thermometer',
            brand: 'TempCheck',
            sku: 'THM-001',
            barcode: '1234567890009',
            category: 'Medical Devices',
            type: 'Device',
            manufacturer: 'MedTech',
            description: 'Digital temperature measurement',
            prescriptionRequired: false,
            supplier: 'MedEquip',
            supplierContact: '+1234567894',
            storageInstructions: 'Store in dry place',
            batches: [
                {
                    batchNumber: 'THM001',
                    quantity: 45,
                    purchasePrice: 300,
                    sellingPrice: 400,
                    mrp: 450,
                    tax: 12,
                    manufacturingDate: '2024-01-01',
                    expiryDate: '2029-01-01',
                    unit: 'Piece'
                }
            ],
            minStock: 20,
            reorderLevel: 30,
            createdAt: new Date('2024-01-25').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 10,
            name: 'Surgical Mask (Box of 50)',
            genericName: 'Disposable Face Mask',
            brand: 'MediMask',
            sku: 'MSK-50',
            barcode: '1234567890010',
            category: 'Surgical Items',
            type: 'Protective Equipment',
            manufacturer: 'SafetyFirst',
            description: '3-ply surgical face masks',
            prescriptionRequired: false,
            supplier: 'MedEquip',
            supplierContact: '+1234567894',
            storageInstructions: 'Store in dry place',
            batches: [
                {
                    batchNumber: 'MSK001',
                    quantity: 120,
                    purchasePrice: 400,
                    sellingPrice: 500,
                    mrp: 550,
                    tax: 12,
                    manufacturingDate: '2024-05-01',
                    expiryDate: '2027-05-01',
                    unit: 'Box'
                }
            ],
            minStock: 30,
            reorderLevel: 60,
            createdAt: new Date('2024-05-15').toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 11,
            name: 'Expired Sample Medicine',
            genericName: 'Sample Generic',
            brand: 'ExpiredBrand',
            sku: 'EXP-001',
            barcode: '1234567890011',
            category: 'OTC Medicines',
            type: 'Tablet',
            manufacturer: 'TestPharma',
            description: 'Sample expired product',
            prescriptionRequired: false,
            supplier: 'Test Supplier',
            supplierContact: '+1234567895',
            storageInstructions: 'Store at room temperature',
            batches: [
                {
                    batchNumber: 'EXP001',
                    quantity: 20,
                    purchasePrice: 50,
                    sellingPrice: 70,
                    mrp: 80,
                    tax: 5,
                    manufacturingDate: '2023-01-01',
                    expiryDate: '2024-06-01',
                    unit: 'Strip'
                }
            ],
            minStock: 10,
            reorderLevel: 20,
            createdAt: new Date('2023-01-15').toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    
    localStorage.setItem('pharmacy_products', JSON.stringify(products));

    // Sample Sales
    const sales = [
        {
            id: 1,
            invoiceNumber: 'INV-000001',
            date: new Date().toISOString(),
            customerName: 'John Doe',
            customerPhone: '+1234567890',
            doctorName: 'Dr. Smith',
            prescriptionNumber: 'RX-001',
            cashier: 'Admin User',
            items: [
                {
                    productId: 1,
                    productName: 'Paracetamol 500mg',
                    batchNumber: 'PCM001',
                    quantity: 2,
                    unitPrice: 100,
                    total: 200
                }
            ],
            subtotal: 200,
            discount: 10,
            discountAmount: 20,
            tax: 5,
            taxAmount: 9,
            grandTotal: 189,
            paymentMethod: 'Cash',
            status: 'Completed'
        }
    ];
    
    localStorage.setItem('pharmacy_sales', JSON.stringify(sales));

    // Settings
    const settings = {
        pharmacyName: 'PharmaCare Medical Store',
        address: '123 Medical Street, Healthcare City',
        phone: '+1 (555) 123-4567',
        email: 'info@pharmacare.com',
        ntn: 'NTN-123456789',
        currency: 'USD',
        currencySymbol: '$',
        defaultTax: 5,
        invoicePrefix: 'INV',
        lowStockThreshold: 20,
        expiryWarningDays: 30,
        criticalExpiryDays: 7
    };
    
    localStorage.setItem('pharmacy_settings', JSON.stringify(settings));

    localStorage.setItem('pharmacy_data_initialized', 'true');
    localStorage.setItem('pharmacy_next_product_id', '12');
    localStorage.setItem('pharmacy_next_sale_id', '2');
    localStorage.setItem('pharmacy_next_invoice', '2');
}

// Logout function
function logout() {
    Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, logout'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('pharmacy_current_user');
            window.location.href = 'index.html';
        }
    });
}

// Generate sidebar menu based on role
function generateSidebarMenu() {
    const currentUserStr = localStorage.getItem('pharmacy_current_user');
    if (!currentUserStr) return;

    const user = JSON.parse(currentUserStr);
    const menuContainer = document.getElementById('sidebarMenu');
    
    if (!menuContainer) {
        console.error('Sidebar menu container not found');
        return;
    }

    const currentPath = window.location.pathname;
    
    // Helper function to check if menu item is active
    const isActive = (pageName) => {
        return currentPath.includes(pageName) || 
               (currentPath === '/' && pageName === 'dashboard') ||
               (currentPath.endsWith('index.html') && pageName === 'dashboard') ||
               (currentPath.endsWith('/') && pageName === 'dashboard');
    };

    let menuHTML = '';

    // Dashboard - Available to all
    menuHTML += `
        <div class="menu-section">
            <a href="dashboard.html" class="menu-item ${isActive('dashboard') ? 'active' : ''}">
                <i class="fas fa-chart-line"></i>
                <span>Dashboard</span>
            </a>
        </div>
    `;

    // Inventory section
    menuHTML += `
        <div class="menu-section">
            <div class="menu-section-title">Inventory</div>
            <a href="products.html" class="menu-item ${isActive('products') && !isActive('add-product') && !isActive('expired') ? 'active' : ''}">
                <i class="fas fa-pills"></i>
                <span>All Products</span>
            </a>
    `;

    if (user.role === 'admin') {
        menuHTML += `
            <a href="add-product.html" class="menu-item ${isActive('add-product') ? 'active' : ''}">
                <i class="fas fa-plus-circle"></i>
                <span>Add Product</span>
            </a>
        `;
    }

    menuHTML += `
            <a href="inventory.html" class="menu-item ${isActive('inventory') ? 'active' : ''}">
                <i class="fas fa-boxes"></i>
                <span>Stock Management</span>
            </a>
            <a href="expired-products.html" class="menu-item ${isActive('expired-products') || isActive('expired') ? 'active' : ''}">
                <i class="fas fa-ban"></i>
                <span>Expired Products</span>
            </a>
        </div>
    `;

    // POS & Sales
    menuHTML += `
        <div class="menu-section">
            <div class="menu-section-title">Sales</div>
            <a href="pos.html" class="menu-item ${isActive('pos') ? 'active' : ''}">
                <i class="fas fa-cash-register"></i>
                <span>POS / Billing</span>
            </a>
            <a href="sales.html" class="menu-item ${isActive('sales') ? 'active' : ''}">
                <i class="fas fa-receipt"></i>
                <span>Sales History</span>
            </a>
    `;

    if (user.role === 'admin') {
        menuHTML += `
            <a href="reports.html" class="menu-item ${isActive('reports') ? 'active' : ''}">
                <i class="fas fa-chart-bar"></i>
                <span>Reports</span>
            </a>
        `;
    }

    menuHTML += `</div>`;

    // Management - Admin only
    if (user.role === 'admin') {
        menuHTML += `
            <div class="menu-section">
                <div class="menu-section-title">Management</div>
                <a href="users.html" class="menu-item ${isActive('users') ? 'active' : ''}">
                    <i class="fas fa-users"></i>
                    <span>Users</span>
                </a>
                <a href="settings.html" class="menu-item ${isActive('settings') ? 'active' : ''}">
                    <i class="fas fa-cog"></i>
                    <span>Settings</span>
                </a>
            </div>
        `;
    }

    menuContainer.innerHTML = menuHTML;
    console.log('Sidebar menu generated successfully for user:', user.name);
}

// Update user info in topbar
function updateUserInfo() {
    const currentUser = checkAuth();
    if (!currentUser) return;

    const user = JSON.parse(currentUser);
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');

    if (userNameEl) userNameEl.textContent = user.name;
    if (userRoleEl) userRoleEl.textContent = user.role;
}

// Generate notifications
function generateNotifications() {
    const products = JSON.parse(localStorage.getItem('pharmacy_products') || '[]');
    const settings = JSON.parse(localStorage.getItem('pharmacy_settings') || '{}');
    const notifications = [];

    const now = new Date();

    products.forEach(product => {
        product.batches.forEach(batch => {
            const expiryDate = new Date(batch.expiryDate);
            const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

            // Expired
            if (daysUntilExpiry < 0) {
                notifications.push({
                    type: 'danger',
                    icon: 'fa-ban',
                    title: 'Expired Product',
                    message: `${product.name} (Batch: ${batch.batchNumber}) has expired`,
                    time: 'Now'
                });
            }
            // Critical (7 days)
            else if (daysUntilExpiry <= (settings.criticalExpiryDays || 7)) {
                notifications.push({
                    type: 'danger',
                    icon: 'fa-exclamation-triangle',
                    title: 'Critical Expiry',
                    message: `${product.name} expires in ${daysUntilExpiry} days`,
                    time: 'Now'
                });
            }
            // Warning (30 days)
            else if (daysUntilExpiry <= (settings.expiryWarningDays || 30)) {
                notifications.push({
                    type: 'warning',
                    icon: 'fa-clock',
                    title: 'Expiring Soon',
                    message: `${product.name} expires in ${daysUntilExpiry} days`,
                    time: 'Today'
                });
            }

            // Low stock
            const totalStock = product.batches.reduce((sum, b) => sum + b.quantity, 0);
            if (totalStock <= product.reorderLevel && totalStock > 0) {
                notifications.push({
                    type: 'warning',
                    icon: 'fa-exclamation-circle',
                    title: 'Low Stock',
                    message: `${product.name} stock is low (${totalStock} units)`,
                    time: 'Today'
                });
            }

            // Out of stock
            if (totalStock === 0) {
                notifications.push({
                    type: 'danger',
                    icon: 'fa-times-circle',
                    title: 'Out of Stock',
                    message: `${product.name} is out of stock`,
                    time: 'Now'
                });
            }
        });
    });

    // Update notification badge
    const notificationBadge = document.getElementById('notificationBadge');
    if (notificationBadge) {
        notificationBadge.textContent = notifications.length;
        notificationBadge.style.display = notifications.length > 0 ? 'block' : 'none';
    }

    // Update notification list
    const notificationList = document.getElementById('notificationList');
    if (notificationList) {
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="empty-state" style="padding: 30px 20px;">
                    <i class="fas fa-check-circle"></i>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">No notifications</p>
                </div>
            `;
        } else {
            notificationList.innerHTML = notifications.map(notif => `
                <div class="notification-item">
                    <div class="notification-item-header">
                        <div class="notification-item-title">
                            <i class="fas ${notif.icon} text-${notif.type} me-2"></i>
                            ${notif.title}
                        </div>
                        <span class="notification-item-time">${notif.time}</span>
                    </div>
                    <div class="notification-item-message">${notif.message}</div>
                </div>
            `).join('');
        }
    }
}

// Sidebar toggle for mobile
function initializeSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            }
        });
    }
}

// Initialize sidebar structure if missing
function initializeSidebarStructure() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    // Check if sidebar-menu exists, if not create full structure
    let menuContainer = document.getElementById('sidebarMenu');
    
    if (!menuContainer) {
        // Sidebar exists but doesn't have proper structure
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <i class="fas fa-prescription-bottle-alt"></i>
                <span>PharmaCare</span>
            </div>
            <div class="sidebar-menu" id="sidebarMenu"></div>
        `;
        console.log('Sidebar structure initialized');
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loading...');
    
    // Check authentication
    checkAuth();
    
    // Initialize app data
    initializeAppData();
    
    // Initialize sidebar structure
    initializeSidebarStructure();
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        // Generate sidebar menu
        generateSidebarMenu();
        
        // Update user info
        updateUserInfo();
        
        // Generate notifications
        generateNotifications();
        
        // Initialize sidebar toggle
        initializeSidebarToggle();
        
        console.log('Page initialized successfully');
    }, 100);
});

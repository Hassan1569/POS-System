// Products page functionality

let currentPage = 1;
const itemsPerPage = 10;
let filteredProducts = [];

// Load products
function loadProducts() {
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const stockFilter = document.getElementById('stockFilter')?.value || '';
    const expiryFilter = document.getElementById('expiryFilter')?.value || '';
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, {});
    const now = new Date();

    // Filter products
    filteredProducts = products.filter(product => {
        // Search filter
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm) ||
            String(product.genericName || '').toLowerCase().includes(searchTerm) ||
            String(product.brand || '').toLowerCase().includes(searchTerm) ||
            String(product.sku || '').toLowerCase().includes(searchTerm) ||
            String(product.barcode || '').includes(searchTerm);

        // Category filter
        const matchesCategory = !categoryFilter || product.category === categoryFilter;

        // Calculate total stock
        const totalStock = product.batches.reduce((sum, batch) => {
            return sum + (Utils.isExpired(batch.expiryDate) ? 0 : Number(batch.quantity) || 0);
        }, 0);

        // Stock filter
        let matchesStock = true;
        if (stockFilter === 'instock') matchesStock = totalStock > product.reorderLevel;
        else if (stockFilter === 'lowstock') matchesStock = totalStock <= product.reorderLevel && totalStock > 0;
        else if (stockFilter === 'outofstock') matchesStock = totalStock === 0;

        // Expiry filter
        let matchesExpiry = true;
        if (expiryFilter) {
            const expiryStatuses = product.batches.map(batch => {
                const expiryDate = new Date(batch.expiryDate);
                const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiry < 0) return 'expired';
                if (daysUntilExpiry <= 7) return 'critical';
                if (daysUntilExpiry <= 30) return 'expiring';
                return 'safe';
            });

            if (expiryFilter === 'safe') matchesExpiry = expiryStatuses.some(s => s === 'safe');
            else if (expiryFilter === 'expiring') matchesExpiry = expiryStatuses.some(s => s === 'expiring');
            else if (expiryFilter === 'critical') matchesExpiry = expiryStatuses.some(s => s === 'critical');
        }

        return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
    });

    renderProducts();
}

// Render products table
function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    const settings = Storage.get(STORAGE_KEYS.SETTINGS, {});
    const currencySymbol = settings.currencySymbol || '$';
    const now = new Date();

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    if (pageProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="empty-state">
                        <i class="fas fa-pills"></i>
                        <h4>No Products Found</h4>
                        <p>Try adjusting your filters or add new products</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('showingCount').textContent = '0';
        document.getElementById('totalCount').textContent = filteredProducts.length;
        return;
    }

    tbody.innerHTML = pageProducts.map(product => {
        // Get earliest expiring batch for display
        let earliestBatch = product.batches[0];
        let earliestExpiry = new Date(earliestBatch.expiryDate);
        
        product.batches.forEach(batch => {
            const batchExpiry = new Date(batch.expiryDate);
            if (batchExpiry < earliestExpiry) {
                earliestBatch = batch;
                earliestExpiry = batchExpiry;
            }
        });

        const totalStock = product.batches.reduce((sum, batch) => {
            return sum + (Utils.isExpired(batch.expiryDate) ? 0 : Number(batch.quantity) || 0);
        }, 0);
        const daysUntilExpiry = Math.floor((earliestExpiry - now) / (1000 * 60 * 60 * 24));

        // Determine expiry status
        let expiryBadge = '';
        if (daysUntilExpiry < 0) {
            expiryBadge = '<span class="badge badge-danger">Expired</span>';
        } else if (daysUntilExpiry <= 7) {
            expiryBadge = `<span class="badge badge-danger">${daysUntilExpiry}d</span>`;
        } else if (daysUntilExpiry <= 30) {
            expiryBadge = `<span class="badge badge-warning">${daysUntilExpiry}d</span>`;
        } else {
            expiryBadge = `<span class="badge badge-success">${earliestExpiry.toLocaleDateString()}</span>`;
        }

        // Determine stock status
        let stockBadge = '';
        if (totalStock === 0) {
            stockBadge = '<span class="badge badge-danger">Out of Stock</span>';
        } else if (totalStock <= product.reorderLevel) {
            stockBadge = '<span class="badge badge-warning">Low Stock</span>';
        } else {
            stockBadge = '<span class="badge badge-success">In Stock</span>';
        }

        const currentUser = Storage.get(STORAGE_KEYS.CURRENT_USER, {});
        const isAdmin = currentUser.role === 'admin';

        return `
            <tr>
                <td>
                    <div>
                        <strong>${product.name}</strong>
                        <br>
                        <small class="text-muted">${product.genericName}</small>
                    </div>
                </td>
                <td>${product.sku}</td>
                <td><span class="badge badge-info">${product.category}</span></td>
                <td>${earliestBatch.batchNumber}</td>
                <td><strong>${totalStock}</strong> ${earliestBatch.unit}</td>
                <td>${currencySymbol}${earliestBatch.sellingPrice}</td>
                <td>${currencySymbol}${earliestBatch.mrp}</td>
                <td>${expiryBadge}</td>
                <td>${stockBadge}</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-icon" onclick="viewProduct(${product.id})" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${isAdmin ? `
                    <button class="btn btn-sm btn-warning btn-icon" onclick="editProduct(${product.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteProduct(${product.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('showingCount').textContent = Math.min(endIndex, filteredProducts.length);
    document.getElementById('totalCount').textContent = filteredProducts.length;
    
    renderPagination();
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '<ul class="pagination mb-0">';
    
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
    </li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
    </li>`;

    html += '</ul>';
    pagination.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderProducts();
}

// View product details
function viewProduct(productId) {
    const products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const settings = Storage.get(STORAGE_KEYS.SETTINGS, {});
    const currencySymbol = settings.currencySymbol || '$';
    const now = new Date();

    const modalBody = document.getElementById('productDetailsBody');
    
    let batchesHTML = product.batches.map(batch => {
        const expiryDate = new Date(batch.expiryDate);
        const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        let expiryClass = 'success';
        if (daysUntilExpiry < 0) expiryClass = 'danger';
        else if (daysUntilExpiry <= 7) expiryClass = 'danger';
        else if (daysUntilExpiry <= 30) expiryClass = 'warning';

        return `
            <tr>
                <td>${batch.batchNumber}</td>
                <td>${batch.quantity} ${batch.unit}</td>
                <td>${currencySymbol}${batch.purchasePrice}</td>
                <td>${currencySymbol}${batch.sellingPrice}</td>
                <td>${currencySymbol}${batch.mrp}</td>
                <td><span class="badge badge-${expiryClass}">${expiryDate.toLocaleDateString()}</span></td>
            </tr>
        `;
    }).join('');

    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="mb-3">Basic Information</h6>
                <table class="table table-sm">
                    <tr><th>Product Name:</th><td>${product.name}</td></tr>
                    <tr><th>Generic Name:</th><td>${product.genericName}</td></tr>
                    <tr><th>Brand:</th><td>${product.brand}</td></tr>
                    <tr><th>SKU:</th><td>${product.sku}</td></tr>
                    <tr><th>Barcode:</th><td>${product.barcode}</td></tr>
                    <tr><th>Category:</th><td>${product.category}</td></tr>
                    <tr><th>Type:</th><td>${product.type}</td></tr>
                    <tr><th>Manufacturer:</th><td>${product.manufacturer}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="mb-3">Additional Information</h6>
                <table class="table table-sm">
                    <tr><th>Prescription Required:</th><td>${product.prescriptionRequired ? 'Yes' : 'No'}</td></tr>
                    <tr><th>Supplier:</th><td>${product.supplier}</td></tr>
                    <tr><th>Supplier Contact:</th><td>${product.supplierContact}</td></tr>
                    <tr><th>Min Stock:</th><td>${product.minStock}</td></tr>
                    <tr><th>Reorder Level:</th><td>${product.reorderLevel}</td></tr>
                    <tr><th>Storage:</th><td>${product.storageInstructions}</td></tr>
                </table>
            </div>
        </div>
        
        <h6 class="mt-4 mb-3">Batches</h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Batch No.</th>
                        <th>Quantity</th>
                        <th>Purchase Price</th>
                        <th>Selling Price</th>
                        <th>MRP</th>
                        <th>Expiry Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${batchesHTML}
                </tbody>
            </table>
        </div>
        
        ${product.description ? `
        <h6 class="mt-4 mb-3">Description</h6>
        <p>${product.description}</p>
        ` : ''}
    `;

    const modal = new bootstrap.Modal(document.getElementById('viewProductModal'));
    modal.show();
}

// Delete product
function deleteProduct(productId) {
    Swal.fire({
        title: 'Delete Product',
        text: 'Are you sure you want to delete this product? This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it'
    }).then((result) => {
        if (result.isConfirmed) {
            let products = Storage.get(STORAGE_KEYS.PRODUCTS, []);
            products = products.filter(p => p.id !== productId);
            Storage.set(STORAGE_KEYS.PRODUCTS, products);
            
            Swal.fire({
                icon: 'success',
                title: 'Deleted',
                text: 'Product has been deleted successfully',
                timer: 2000,
                showConfirmButton: false
            });
            
            loadProducts();
        }
    });
}

// Edit product (redirect to add-product page with edit mode)
function editProduct(productId) {
    window.location.href = `add-product.html?edit=${productId}`;
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('stockFilter').value = '';
    document.getElementById('expiryFilter').value = '';
    currentPage = 1;
    loadProducts();
}

// Load categories for filter
function loadCategories() {
    const categories = Storage.get(STORAGE_KEYS.CATEGORIES, []);
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (categoryFilter) {
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }
}

// Check if user is admin and show add button
function checkAdminAccess() {
    const currentUser = Storage.get(STORAGE_KEYS.CURRENT_USER, {});
    const addProductButton = document.getElementById('addProductButton');
    
    if (addProductButton && currentUser.role === 'admin') {
        addProductButton.innerHTML = `
            <a href="add-product.html" class="btn btn-primary">
                <i class="fas fa-plus me-2"></i>Add Product
            </a>
        `;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('products')) return;
    
    loadCategories();
    checkAdminAccess();
    loadProducts();
    
    // Add event listeners
    document.getElementById('searchInput')?.addEventListener('input', () => {
        currentPage = 1;
        loadProducts();
    });
    
    document.getElementById('categoryFilter')?.addEventListener('change', () => {
        currentPage = 1;
        loadProducts();
    });
    
    document.getElementById('stockFilter')?.addEventListener('change', () => {
        currentPage = 1;
        loadProducts();
    });
    
    document.getElementById('expiryFilter')?.addEventListener('change', () => {
        currentPage = 1;
        loadProducts();
    });
});

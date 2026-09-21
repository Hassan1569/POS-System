// POS functionality with FEFO logic

let cart = [];
let currentInvoiceData = null;

// Search products
function searchProducts() {
    const searchTerm = document.getElementById('posSearchInput').value.toLowerCase().trim();
    const searchResults = document.getElementById('searchResults');
    
    if (searchTerm.length < 2) {
        searchResults.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-search fa-3x mb-3 opacity-25"></i>
                <p>Start typing to search products</p>
            </div>
        `;
        return;
    }
    
    const products = JSON.parse(localStorage.getItem('pharmacy_products') || '[]');
    const settings = JSON.parse(localStorage.getItem('pharmacy_settings') || '{}');
    const currencySymbol = settings.currencySymbol || '$';
    const now = new Date();
    
    // Filter products
    const results = products.filter(product => {
        return product.name.toLowerCase().includes(searchTerm) ||
               product.genericName.toLowerCase().includes(searchTerm) ||
               product.brand.toLowerCase().includes(searchTerm) ||
               product.sku.toLowerCase().includes(searchTerm) ||
               product.barcode.includes(searchTerm);
    }).filter(product => {
        // Filter out expired products
        const hasValidStock = product.batches.some(batch => {
            const expiryDate = new Date(batch.expiryDate);
            return expiryDate >= now && batch.quantity > 0;
        });
        return hasValidStock;
    });
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>No Products Found</h4>
                <p>No products match your search criteria</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML = results.map(product => {
        const totalStock = product.batches.reduce((sum, batch) => {
            const expiryDate = new Date(batch.expiryDate);
            return expiryDate >= now ? sum + batch.quantity : sum;
        }, 0);
        
        // Get selling price from earliest expiring valid batch
        let validBatches = product.batches.filter(batch => {
            const expiryDate = new Date(batch.expiryDate);
            return expiryDate >= now && batch.quantity > 0;
        }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        
        const sellingPrice = validBatches.length > 0 ? validBatches[0].sellingPrice : 0;
        
        let stockBadge = '';
        if (totalStock === 0) {
            stockBadge = '<span class="badge badge-danger">Out of Stock</span>';
        } else if (totalStock <= product.reorderLevel) {
            stockBadge = '<span class="badge badge-warning">Low Stock</span>';
        } else {
            stockBadge = '<span class="badge badge-success">In Stock</span>';
        }
        
        return `
            <div class="search-result-item" onclick='addToCart(${JSON.stringify(product)})'>
                <div class="search-result-info">
                    <h6>${product.name}</h6>
                    <small>${product.genericName} - ${product.brand}</small>
                    <small class="d-block">SKU: ${product.sku} | ${stockBadge}</small>
                </div>
                <div class="search-result-price">
                    <div class="price">${currencySymbol}${sellingPrice}</div>
                    <div class="stock">Stock: ${totalStock}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Add to cart with FEFO logic
function addToCart(product) {
    const now = new Date();
    
    // Get valid batches (not expired, has stock)
    const validBatches = product.batches.filter(batch => {
        const expiryDate = new Date(batch.expiryDate);
        return expiryDate >= now && batch.quantity > 0;
    }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    
    if (validBatches.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Cannot Add',
            text: 'This product has no valid stock available',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }
    
    // Use earliest expiring batch (FEFO)
    const selectedBatch = validBatches[0];
    
    // Check if already in cart
    const existingItem = cart.find(item => 
        item.productId === product.id && item.batchNumber === selectedBatch.batchNumber
    );
    
    if (existingItem) {
        // Check stock limit
        if (existingItem.quantity >= selectedBatch.quantity) {
            Swal.fire({
                icon: 'warning',
                title: 'Stock Limit',
                text: `Only ${selectedBatch.quantity} units available in this batch`,
                confirmButtonColor: '#3b82f6'
            });
            return;
        }
        existingItem.quantity++;
        existingItem.total = existingItem.quantity * existingItem.unitPrice;
    } else {
        cart.push({
            productId: product.id,
            productName: product.name,
            genericName: product.genericName,
            batchNumber: selectedBatch.batchNumber,
            expiryDate: selectedBatch.expiryDate,
            unitPrice: selectedBatch.sellingPrice,
            quantity: 1,
            total: selectedBatch.sellingPrice,
            maxStock: selectedBatch.quantity,
            unit: selectedBatch.unit
        });
    }
    
    renderCart();
    updateCartSummary();
}

// Render cart
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const settings = JSON.parse(localStorage.getItem('pharmacy_settings') || '{}');
    const currencySymbol = settings.currencySymbol || '$';
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h4>Cart is Empty</h4>
                <p>Add products to get started</p>
            </div>
        `;
        document.getElementById('generateBillBtn').disabled = true;
        return;
    }
    
    document.getElementById('generateBillBtn').disabled = false;
    
    cartItems.innerHTML = cart.map((item, index) => {
        const expiryDate = new Date(item.expiryDate);
        const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
        let expiryBadge = '';
        if (daysUntilExpiry <= 7) {
            expiryBadge = `<span class="badge badge-danger ms-2">Exp: ${daysUntilExpiry}d</span>`;
        } else if (daysUntilExpiry <= 30) {
            expiryBadge = `<span class="badge badge-warning ms-2">Exp: ${daysUntilExpiry}d</span>`;
        }
        
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.productName}</div>
                    <div class="cart-item-details">
                        Batch: ${item.batchNumber} ${expiryBadge}
                        <br>${currencySymbol}${item.unitPrice} × ${item.quantity} = ${currencySymbol}${item.total.toFixed(2)}
                    </div>
                </div>
                <div class="quantity-control">
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxStock}" 
                           onchange="setQuantity(${index}, this.value)">
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update quantity
function updateQuantity(index, change) {
    const item = cart[index];
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        removeFromCart(index);
        return;
    }
    
    if (newQuantity > item.maxStock) {
        Swal.fire({
            icon: 'warning',
            title: 'Stock Limit',
            text: `Only ${item.maxStock} units available`,
            confirmButtonColor: '#3b82f6'
        });
        return;
    }
    
    item.quantity = newQuantity;
    item.total = item.quantity * item.unitPrice;
    
    renderCart();
    updateCartSummary();
}

// Set quantity directly
function setQuantity(index, value) {
    const item = cart[index];
    const newQuantity = parseInt(value) || 1;
    
    if (newQuantity < 1) {
        removeFromCart(index);
        return;
    }
    
    if (newQuantity > item.maxStock) {
        Swal.fire({
            icon: 'warning',
            title: 'Stock Limit',
            text: `Only ${item.maxStock} units available`,
            confirmButtonColor: '#3b82f6'
        });
        renderCart();
        return;
    }
    
    item.quantity = newQuantity;
    item.total = item.quantity * item.unitPrice;
    
    renderCart();
    updateCartSummary();
}

// Remove from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
    updateCartSummary();
}

// Clear cart
function clearCart() {
    if (cart.length === 0) return;
    
    Swal.fire({
        title: 'Clear Cart',
        text: 'Are you sure you want to clear all items from the cart?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, clear it'
    }).then((result) => {
        if (result.isConfirmed) {
            cart = [];
            renderCart();
            updateCartSummary();
        }
    });
}

// Update cart summary
function updateCartSummary() {
    const settings = JSON.parse(localStorage.getItem('pharmacy_settings') || '{}');
    const currencySymbol = settings.currencySymbol || '$';
    
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    
    // Validate discount
    if (discountPercent < 0 || discountPercent > 100) {
        document.getElementById('discountPercent').value = 0;
        return;
    }
    
    const discountAmount = (subtotal * discountPercent) / 100;
    const grandTotal = subtotal - discountAmount;
    
    document.getElementById('subtotal').textContent = currencySymbol + subtotal.toFixed(2);
    document.getElementById('discountAmount').textContent = currencySymbol + discountAmount.toFixed(2);
    document.getElementById('grandTotal').textContent = currencySymbol + grandTotal.toFixed(2);
}

// Generate bill
function generateBill() {
    if (cart.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Empty Cart',
            text: 'Please add products to cart first',
            confirmButtonColor: '#3b82f6'
        });
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('pharmacy_settings') || '{}');
    const currentUser = JSON.parse(localStorage.getItem('pharmacy_current_user') || '{}');
    const currencySymbol = settings.currencySymbol || '$';
    
    const customerName = document.getElementById('customerName').value || 'Walk-in Customer';
    const customerPhone = document.getElementById('customerPhone').value || '-';
    const doctorName = document.getElementById('doctorName').value || '-';
    const prescriptionNumber = document.getElementById('prescriptionNumber').value || '-';
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const grandTotal = subtotal - discountAmount;
    
    // Generate invoice number
    const nextInvoice = parseInt(localStorage.getItem('pharmacy_next_invoice') || '1');
    const invoiceNumber = settings.invoicePrefix + '-' + String(nextInvoice).padStart(6, '0');
    
    const now = new Date();
    
    // Create invoice data
    currentInvoiceData = {
        invoiceNumber: invoiceNumber,
        date: now.toISOString(),
        customerName: customerName,
        customerPhone: customerPhone,
        doctorName: doctorName,
        prescriptionNumber: prescriptionNumber,
        cashier: currentUser.name,
        items: [...cart],
        subtotal: subtotal,
        discount: discountPercent,
        discountAmount: discountAmount,
        grandTotal: grandTotal,
        paymentMethod: paymentMethod
    };
    
    // Generate invoice HTML
    const invoiceContent = document.getElementById('invoiceContent');
    
    invoiceContent.innerHTML = `
        <div id="printableInvoice" style="max-width: 800px; margin: 0 auto; font-family: 'Inter', sans-serif;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #3b82f6; font-size: 32px;">
                    <i class="fas fa-prescription-bottle-alt"></i> ${settings.pharmacyName}
                </h2>
                <p style="margin: 5px 0;">${settings.address}</p>
                <p style="margin: 5px 0;">Phone: ${settings.phone} | Email: ${settings.email}</p>
                ${settings.ntn ? `<p style="margin: 5px 0;">NTN: ${settings.ntn}</p>` : ''}
            </div>
            
            <div style="margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <strong>Invoice #:</strong> ${invoiceNumber}<br>
                        <strong>Date:</strong> ${now.toLocaleString()}<br>
                        <strong>Cashier:</strong> ${currentUser.name}
                    </div>
                    <div>
                        <strong>Customer:</strong> ${customerName}<br>
                        <strong>Phone:</strong> ${customerPhone}<br>
                        ${doctorName !== '-' ? `<strong>Doctor:</strong> ${doctorName}<br>` : ''}
                        ${prescriptionNumber !== '-' ? `<strong>Prescription #:</strong> ${prescriptionNumber}` : ''}
                    </div>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #f3f4f6; border-bottom: 2px solid #000;">
                        <th style="padding: 10px; text-align: left;">Product</th>
                        <th style="padding: 10px; text-align: center;">Batch</th>
                        <th style="padding: 10px; text-align: center;">Qty</th>
                        <th style="padding: 10px; text-align: right;">Price</th>
                        <th style="padding: 10px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${cart.map(item => `
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 10px;">${item.productName}</td>
                            <td style="padding: 10px; text-align: center;">${item.batchNumber}</td>
                            <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                            <td style="padding: 10px; text-align: right;">${currencySymbol}${item.unitPrice.toFixed(2)}</td>
                            <td style="padding: 10px; text-align: right;">${currencySymbol}${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="text-align: right; margin-bottom: 20px;">
                <table style="margin-left: auto; width: 300px;">
                    <tr>
                        <td style="padding: 5px;"><strong>Subtotal:</strong></td>
                        <td style="padding: 5px; text-align: right;">${currencySymbol}${subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px;"><strong>Discount (${discountPercent}%):</strong></td>
                        <td style="padding: 5px; text-align: right; color: #ef4444;">-${currencySymbol}${discountAmount.toFixed(2)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #000; font-size: 18px;">
                        <td style="padding: 10px 5px;"><strong>GRAND TOTAL:</strong></td>
                        <td style="padding: 10px 5px; text-align: right;"><strong>${currencySymbol}${grandTotal.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px;"><strong>Payment Method:</strong></td>
                        <td style="padding: 5px; text-align: right;">${paymentMethod}</td>
                    </tr>
                </table>
            </div>
            
            <div style="text-align: center; border-top: 2px solid #000; padding-top: 20px; margin-top: 30px;">
                <p style="margin: 0; font-style: italic;">Thank you for your purchase!</p>
                <p style="margin: 5px 0; font-size: 12px;">This is a computer-generated invoice</p>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    modal.show();
}

// Print invoice
function printInvoice() {
    const printContent = document.getElementById('printableInvoice').cloneNode(true);
    const printWindow = window.open('', '', 'width=800,height=600');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${currentInvoiceData.invoiceNumber}</title>
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>
                body { font-family: 'Inter', Arial, sans-serif; padding: 20px; }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${printContent.outerHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

// Confirm sale
function confirmSale() {
    // Validate stock availability
    const products = JSON.parse(localStorage.getItem('pharmacy_products') || '[]');
    
    for (let cartItem of cart) {
        const product = products.find(p => p.id === cartItem.productId);
        if (!product) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Product not found in inventory',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }
        
        const batch = product.batches.find(b => b.batchNumber === cartItem.batchNumber);
        if (!batch || batch.quantity < cartItem.quantity) {
            Swal.fire({
                icon: 'error',
                title: 'Insufficient Stock',
                text: `Not enough stock for ${cartItem.productName}`,
                confirmButtonColor: '#3b82f6'
            });
            return;
        }
    }
    
    // Deduct stock using FEFO
    cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.productId);
        const batch = product.batches.find(b => b.batchNumber === cartItem.batchNumber);
        batch.quantity -= cartItem.quantity;
    });
    
    localStorage.setItem('pharmacy_products', JSON.stringify(products));
    
    // Save sale
    const sales = JSON.parse(localStorage.getItem('pharmacy_sales') || '[]');
    const nextSaleId = parseInt(localStorage.getItem('pharmacy_next_sale_id') || '1');
    
    const sale = {
        id: nextSaleId,
        ...currentInvoiceData,
        status: 'Completed'
    };
    
    sales.push(sale);
    localStorage.setItem('pharmacy_sales', JSON.stringify(sales));
    localStorage.setItem('pharmacy_next_sale_id', (nextSaleId + 1).toString());
    
    // Increment invoice number
    const nextInvoice = parseInt(localStorage.getItem('pharmacy_next_invoice') || '1');
    localStorage.setItem('pharmacy_next_invoice', (nextInvoice + 1).toString());
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('invoiceModal')).hide();
    
    // Show success message
    Swal.fire({
        icon: 'success',
        title: 'Sale Completed',
        html: `Invoice <strong>${currentInvoiceData.invoiceNumber}</strong> has been saved successfully!`,
        confirmButtonColor: '#10b981',
        timer: 3000
    });
    
    // Clear cart and reset form
    cart = [];
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('doctorName').value = '';
    document.getElementById('prescriptionNumber').value = '';
    document.getElementById('discountPercent').value = '0';
    document.getElementById('posSearchInput').value = '';
    
    renderCart();
    updateCartSummary();
    searchProducts();
}

// Initialize POS
document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('pos')) return;
    
    renderCart();
    updateCartSummary();
    
    // Add search event listener
    const searchInput = document.getElementById('posSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchProducts);
    }
});

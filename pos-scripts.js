/**
 * Pharmacy POS — checkout and FEFO allocation engine.
 * Cart is product-level; batch consumption is resolved atomically at confirmation.
 */
let cart = [];
let currentInvoiceData = null;

function getProducts() { return Storage.get(STORAGE_KEYS.PRODUCTS, []); }
function getSettings() { return Storage.get(STORAGE_KEYS.SETTINGS, {}); }
function getCurrentUser() { return Storage.get(STORAGE_KEYS.CURRENT_USER, {}); }

function getValidBatches(product) {
    return (product?.batches || [])
        .filter(batch => Number(batch.quantity) > 0 && !Utils.isExpired(batch.expiryDate))
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
}

function previewAllocations(product, quantity) {
    return Utils.allocateBatchesFEFO(product, Number(quantity));
}

function getProductAvailableStock(product) {
    return getValidBatches(product).reduce((sum, batch) => sum + Number(batch.quantity || 0), 0);
}

function searchProducts() {
    const input = document.getElementById('posSearchInput');
    const searchResults = document.getElementById('searchResults');
    if (!input || !searchResults) return;

    const searchTerm = input.value.toLowerCase().trim();
    if (searchTerm.length < 2) {
        searchResults.innerHTML = `<div class="text-center text-muted py-5"><i class="fas fa-search fa-3x mb-3 opacity-25"></i><p>Start typing to search products</p></div>`;
        return;
    }

    const products = getProducts();
    const settings = getSettings();
    const symbol = settings.currencySymbol || '$';

    const results = products.filter(product => {
        const haystack = [
            product.name, product.genericName, product.brand, product.sku, product.barcode, product.category
        ].map(v => String(v || '').toLowerCase());
        return haystack.some(v => v.includes(searchTerm)) && getProductAvailableStock(product) > 0;
    });

    if (!results.length) {
        searchResults.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h4>No Products Found</h4><p>No sellable, non-expired stock matches your search.</p></div>`;
        return;
    }

    searchResults.innerHTML = results.map(product => {
        const batches = getValidBatches(product);
        const stock = getProductAvailableStock(product);
        const first = batches[0];
        const status = Utils.calculateStockStatus(product);
        const safe = typeof Utils.escapeHTML === 'function' ? Utils.escapeHTML : v => String(v ?? '');
        return `
            <div class="search-result-item" data-product-id="${safe(product.id)}" onclick='addToCart(${JSON.stringify(product).replace(/'/g, "&#39;")})'>
                <div class="search-result-info">
                    <h6>${safe(product.name)}</h6>
                    <small>${safe(product.genericName)} - ${safe(product.brand)}</small>
                    <small class="d-block">SKU: ${safe(product.sku)} | <span class="badge ${status.badgeClass}">${status.label}</span></small>
                </div>
                <div class="search-result-price">
                    <div class="price">${symbol}${Number(first.sellingPrice || 0).toFixed(2)}</div>
                    <div class="stock">Valid stock: ${stock}</div>
                </div>
            </div>`;
    }).join('');
}

function addToCart(product) {
    const fresh = getProducts().find(p => String(p.id) === String(product.id));
    if (!fresh) return;

    const available = getProductAvailableStock(fresh);
    if (available < 1) {
        Swal.fire({icon:'error', title:'Cannot Add', text:'This product has no non-expired stock available.'});
        return;
    }

    const existing = cart.find(item => String(item.productId) === String(fresh.id));
    if (existing) {
        if (existing.quantity >= available) {
            Swal.fire({icon:'warning', title:'Stock Limit', text:`Only ${available} non-expired units are available.`});
            return;
        }
        existing.quantity += 1;
    } else {
        cart.push({
            productId: fresh.id,
            productName: fresh.name,
            genericName: fresh.genericName || '',
            quantity: 1,
            unit: fresh.unit || fresh.batches?.[0]?.unit || 'Unit'
        });
    }
    persistCart();
    renderCart();
    updateCartSummary();
}

function persistCart() {
    Storage.set(STORAGE_KEYS.ACTIVE_CART, cart);
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const button = document.getElementById('generateBillBtn');
    if (!cartItems) return;

    const settings = getSettings();
    const symbol = settings.currencySymbol || '$';

    if (!cart.length) {
        cartItems.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-cart"></i><h4>Cart is Empty</h4><p>Add products to get started</p></div>`;
        if (button) button.disabled = true;
        return;
    }

    if (button) button.disabled = false;
    const products = getProducts();

    cartItems.innerHTML = cart.map((item, index) => {
        const product = products.find(p => String(p.id) === String(item.productId));
        const available = product ? getProductAvailableStock(product) : 0;
        const allocation = product ? previewAllocations(product, item.quantity) : {success:false, allocations:[]};
        const estimated = allocation.success
            ? allocation.allocations.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0)
            : 0;
        const first = allocation.allocations[0];
        const safe = typeof Utils.escapeHTML === 'function' ? Utils.escapeHTML : v => String(v ?? '');
        const batchText = allocation.success
            ? allocation.allocations.map(a => `${safe(a.batchNumber)} × ${a.quantity}`).join(', ')
            : 'Stock changed — recheck at checkout';

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${safe(item.productName)}</div>
                    <div class="cart-item-details">
                        FEFO: ${batchText}
                        <br>${symbol}${estimated.toFixed(2)} estimated · ${available} available
                        ${first ? `<span class="badge badge-info ms-2">Earliest expiry ${safe(first.expiryDate)}</span>` : ''}
                    </div>
                </div>
                <div class="quantity-control">
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, -1)" aria-label="Decrease quantity"><i class="fas fa-minus"></i></button>
                    <input type="number" value="${item.quantity}" min="1" max="${available}" onchange="setQuantity(${index}, this.value)" aria-label="Quantity">
                    <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity(${index}, 1)" aria-label="Increase quantity"><i class="fas fa-plus"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})" aria-label="Remove item"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    }).join('');
}

function updateQuantity(index, change) {
    const item = cart[index];
    if (!item) return;
    const product = getProducts().find(p => String(p.id) === String(item.productId));
    const max = product ? getProductAvailableStock(product) : 0;
    const next = item.quantity + change;
    if (next < 1) return removeFromCart(index);
    if (next > max) return Swal.fire({icon:'warning', title:'Stock Limit', text:`Only ${max} non-expired units are available.`});
    item.quantity = next;
    persistCart(); renderCart(); updateCartSummary();
}

function setQuantity(index, value) {
    const item = cart[index];
    if (!item) return;
    const product = getProducts().find(p => String(p.id) === String(item.productId));
    const max = product ? getProductAvailableStock(product) : 0;
    const next = parseInt(value, 10);
    if (!Number.isInteger(next) || next < 1) return removeFromCart(index);
    if (next > max) {
        Swal.fire({icon:'warning', title:'Stock Limit', text:`Only ${max} non-expired units are available.`});
        renderCart(); return;
    }
    item.quantity = next;
    persistCart(); renderCart(); updateCartSummary();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    persistCart(); renderCart(); updateCartSummary();
}

function clearCart() {
    if (!cart.length) return;
    Swal.fire({
        title:'Clear Cart', text:'Remove all items from the current cart?', icon:'warning',
        showCancelButton:true, confirmButtonColor:'#ef4444'
    }).then(result => {
        if (result.isConfirmed) {
            cart = [];
            persistCart(); renderCart(); updateCartSummary();
        }
    });
}

function getCartFinancials() {
    const products = getProducts();
    let subtotal = 0;
    for (const item of cart) {
        const product = products.find(p => String(p.id) === String(item.productId));
        const allocation = product ? previewAllocations(product, item.quantity) : {success:false, allocations:[]};
        if (allocation.success) subtotal += allocation.allocations.reduce((s,a) => s + a.quantity * a.unitPrice, 0);
    }
    const discount = parseFloat(document.getElementById('discountPercent')?.value) || 0;
    const tax = Number(getSettings().defaultTax) || 0;
    return Utils.calculateFinancials(subtotal, discount, tax);
}

function updateCartSummary() {
    const settings = getSettings();
    const symbol = settings.currencySymbol || '$';
    const financials = getCartFinancials();
    document.getElementById('subtotal').textContent = symbol + financials.subtotal.toFixed(2);
    document.getElementById('discountAmount').textContent = symbol + financials.discountAmount.toFixed(2);
    document.getElementById('grandTotal').textContent = symbol + financials.grandTotal.toFixed(2);
}

function buildInvoicePreview(data) {
    const settings = getSettings();
    const symbol = settings.currencySymbol || '$';
    const safe = typeof Utils.escapeHTML === 'function' ? Utils.escapeHTML : v => String(v ?? '');
    const items = data.items || [];

    return `
        <div id="printableInvoice" class="invoice-paper">
            <div class="text-center border-bottom pb-3 mb-3">
                <h2>${safe(settings.pharmacyName || 'Pharmacy')}</h2>
                <p>${safe(settings.address || '')}</p>
                <p>Phone: ${safe(settings.phone || '')} | Email: ${safe(settings.email || '')}</p>
                ${settings.ntn ? `<p>Registration/NTN: ${safe(settings.ntn)}</p>` : ''}
            </div>
            <div class="row mb-3">
                <div class="col-6"><strong>Invoice #:</strong> ${safe(data.invoiceNumber)}<br><strong>Date:</strong> ${safe(new Date(data.date).toLocaleString())}<br><strong>Cashier:</strong> ${safe(data.cashier)}</div>
                <div class="col-6"><strong>Customer:</strong> ${safe(data.customer.name)}<br><strong>Phone:</strong> ${safe(data.customer.phone)}</div>
            </div>
            <table class="table table-bordered">
                <thead><tr><th>Product</th><th>Batch</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>${items.map(item => `<tr><td>${safe(item.productName)}</td><td>${safe(item.batchNumber)}</td><td>${item.quantity}</td><td>${symbol}${Number(item.unitPrice).toFixed(2)}</td><td>${symbol}${Number(item.subtotal).toFixed(2)}</td></tr>`).join('')}</tbody>
            </table>
            <div class="text-end">
                <div>Subtotal: ${symbol}${data.subtotal.toFixed(2)}</div>
                <div>Discount (${data.discountPercent}%): -${symbol}${data.discountAmount.toFixed(2)}</div>
                <div>Tax (${data.taxPercent}%): ${symbol}${data.taxAmount.toFixed(2)}</div>
                <h4>Grand Total: ${symbol}${data.grandTotal.toFixed(2)}</h4>
                <div>Payment: ${safe(data.paymentMethod)}</div>
            </div>
            <div class="text-center border-top pt-3 mt-3"><small>Thank you for your purchase.</small></div>
        </div>`;
}

function generateBill() {
    if (!cart.length) return Swal.fire({icon:'warning', title:'Empty Cart', text:'Please add products first.'});

    const financials = getCartFinancials();
    if (!financials.subtotal) return Swal.fire({icon:'error', title:'Stock Unavailable', text:'One or more cart items no longer have valid stock.'});

    const settings = getSettings();
    const user = getCurrentUser();
    const nextInvoice = Number(Storage.get(STORAGE_KEYS.NEXT_INVOICE, 1));
    const prefix = settings.invoicePrefix || 'INV';

    currentInvoiceData = {
        invoiceNumber: `${prefix}-${String(nextInvoice).padStart(6, '0')}`,
        date: new Date().toISOString(),
        cashier: user.name || 'Cashier',
        customer: {
            name: document.getElementById('customerName')?.value.trim() || 'Walk-in Customer',
            phone: document.getElementById('customerPhone')?.value.trim() || '-',
            doctorName: document.getElementById('doctorName')?.value.trim() || '-',
            prescriptionNumber: document.getElementById('prescriptionNumber')?.value.trim() || '-'
        },
        items: [],
        subtotal: financials.subtotal,
        discountPercent: financials.discountPercent,
        discountAmount: financials.discountAmount,
        taxPercent: financials.taxPercent,
        taxAmount: financials.taxAmount,
        grandTotal: financials.grandTotal,
        paymentMethod: document.getElementById('paymentMethod')?.value || 'Cash'
    };

    document.getElementById('invoiceContent').innerHTML = buildInvoicePreview(currentInvoiceData);
    new bootstrap.Modal(document.getElementById('invoiceModal')).show();
}

function printInvoice() {
    const node = document.getElementById('printableInvoice');
    if (!node || !currentInvoiceData) return;
    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) return Swal.fire({icon:'warning', title:'Popup Blocked', text:'Allow popups to print the invoice.'});
    printWindow.document.write(`<!doctype html><html><head><title>${currentInvoiceData.invoiceNumber}</title><link rel="stylesheet" href="css/print.css"></head><body>${node.outerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
}

function confirmSale() {
    const products = getProducts();
    const allocationsByProduct = [];
    const saleItems = [];

    // Phase 1: validate everything and calculate allocations. No storage mutation.
    for (const cartItem of cart) {
        const product = products.find(p => String(p.id) === String(cartItem.productId));
        if (!product) return Swal.fire({icon:'error', title:'Sale Blocked', text:`${cartItem.productName} no longer exists.`});
        const allocation = previewAllocations(product, cartItem.quantity);
        if (!allocation.success) {
            return Swal.fire({icon:'error', title:'Sale Blocked', text:allocation.message});
        }
        allocationsByProduct.push({product, allocation});
    }

    const settings = getSettings();
    const taxPercent = Number(settings.defaultTax) || 0;
    const discountPercent = Number(currentInvoiceData?.discountPercent || 0);
    const subtotal = allocationsByProduct.reduce((sum, x) => sum + x.allocation.allocations.reduce((s,a) => s + a.quantity*a.unitPrice,0), 0);
    const financials = Utils.calculateFinancials(subtotal, discountPercent, taxPercent);

    for (const {product, allocation} of allocationsByProduct) {
        for (const a of allocation.allocations) {
            const lineTotal = Number((a.quantity * a.unitPrice).toFixed(2));
            saleItems.push({
                productId: product.id,
                productName: product.name,
                batchId: a.batchId,
                batchNumber: a.batchNumber,
                quantity: a.quantity,
                unitPrice: a.unitPrice,
                purchasePrice: a.purchasePrice,
                mrp: a.mrp,
                expiryDate: a.expiryDate,
                subtotal: lineTotal,
                total: lineTotal,
                unit: a.unit || 'Unit'
            });
        }
    }

    const invoice = {
        ...currentInvoiceData,
        items: saleItems,
        subtotal: financials.subtotal,
        discountPercent: financials.discountPercent,
        discount: financials.discountPercent,
        discountAmount: financials.discountAmount,
        taxPercent: financials.taxPercent,
        taxAmount: financials.taxAmount,
        grandTotal: financials.grandTotal
    };

    // Phase 2: apply all mutations to one in-memory snapshot, then commit together.
    const productsSnapshot = JSON.parse(JSON.stringify(products));
    for (const item of saleItems) {
        const product = productsSnapshot.find(p => String(p.id) === String(item.productId));
        const batch = (product.batches || []).find(b => String(b.id || b.batchNumber) === String(item.batchId) || b.batchNumber === item.batchNumber);
        if (!batch || Number(batch.quantity) < item.quantity) {
            return Swal.fire({icon:'error', title:'Sale Blocked', text:'Inventory changed while preparing the sale. Nothing was deducted.'});
        }
        batch.quantity = Number(batch.quantity) - item.quantity;
        product.updatedAt = new Date().toISOString();
    }

    const sales = Storage.get(STORAGE_KEYS.SALES, []);
    const nextSaleId = Number(Storage.get(STORAGE_KEYS.NEXT_SALE_ID, 1));
    const sale = { id: nextSaleId, ...invoice, status:'Completed' };
    sales.push(sale);

    if (!Storage.set(STORAGE_KEYS.PRODUCTS, productsSnapshot)) return Swal.fire({icon:'error', title:'Save Failed', text:'Inventory could not be saved; sale was not recorded.'});
    if (!Storage.set(STORAGE_KEYS.SALES, sales)) {
        // Best-effort rollback of inventory if sale persistence fails.
        Storage.set(STORAGE_KEYS.PRODUCTS, products);
        return Swal.fire({icon:'error', title:'Save Failed', text:'Sale could not be recorded; inventory was restored.'});
    }
    Storage.set(STORAGE_KEYS.NEXT_SALE_ID, nextSaleId + 1);
    Storage.set(STORAGE_KEYS.NEXT_INVOICE, Number(Storage.get(STORAGE_KEYS.NEXT_INVOICE, 1)) + 1);

    bootstrap.Modal.getInstance(document.getElementById('invoiceModal'))?.hide();
    Swal.fire({icon:'success', title:'Sale Completed', html:`Invoice <strong>${invoice.invoiceNumber}</strong> saved.`, timer:2500, showConfirmButton:false});

    cart = [];
    Storage.remove(STORAGE_KEYS.ACTIVE_CART);
    ['customerName','customerPhone','doctorName','prescriptionNumber'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    const discount = document.getElementById('discountPercent'); if (discount) discount.value='0';
    const search = document.getElementById('posSearchInput'); if (search) search.value='';
    renderCart(); updateCartSummary(); searchProducts();
}

document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('pos')) return;
    cart = Storage.get(STORAGE_KEYS.ACTIVE_CART, []);
    renderCart();
    updateCartSummary();
    document.getElementById('posSearchInput')?.addEventListener('input', searchProducts);
    document.getElementById('discountPercent')?.addEventListener('input', updateCartSummary);
});

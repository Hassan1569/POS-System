/**
 * PharmaCare - Shared Utilities & Business Logic Engine
 * Contains FEFO batch calculation, stock/expiry status engines, financial calculations, and formatters.
 */

const Utils = {

    escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
        }[ch]));
    },

    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    },

    generateInvoiceNumber(prefix = 'INV', sequence = 1) {
        return `${prefix}-${String(Number(sequence) || 1).padStart(6, '0')}`;
    },

    calculateSubtotal(items = []) {
        return Number(items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0).toFixed(2));
    },

    /**
     * FEFO (First Expire, First Out) Batch Allocation Engine
     * Automatically consumes earlier expiring valid batches first.
     * 
     * @param {Object} product - The product object containing .batches
     * @param {number} requestedQuantity - Total units desired to purchase
     * @returns {Object} Result object with allocations array or error
     */
    allocateBatchesFEFO(product, requestedQuantity) {
        if (!product || !Array.isArray(product.batches)) {
            return {
                success: false,
                message: 'Invalid product or batch data',
                allocations: [],
                totalAllocated: 0,
                availableStock: 0
            };
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Filter for batches that are NOT expired and have quantity > 0
        const validBatches = product.batches
            .filter(batch => {
                const exp = new Date(batch.expiryDate);
                exp.setHours(23, 59, 59, 999);
                return exp >= now && Number(batch.quantity) > 0;
            })
            // Sort ascending by expiry date (earliest expiry first)
            .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

        const totalAvailableStock = validBatches.reduce((sum, b) => sum + Number(b.quantity), 0);

        if (requestedQuantity > totalAvailableStock) {
            return {
                success: false,
                message: `Insufficient valid stock. Requested: ${requestedQuantity}, Available non-expired: ${totalAvailableStock}`,
                allocations: [],
                totalAllocated: 0,
                availableStock: totalAvailableStock
            };
        }

        let remaining = requestedQuantity;
        const allocations = [];

        for (const batch of validBatches) {
            if (remaining <= 0) break;

            const takeQty = Math.min(Number(batch.quantity), remaining);
            allocations.push({
                batchId: batch.id || batch.batchNumber,
                batchNumber: batch.batchNumber,
                quantity: takeQty,
                unitPrice: Number(batch.sellingPrice),
                purchasePrice: Number(batch.purchasePrice),
                mrp: Number(batch.mrp || batch.sellingPrice),
                tax: Number(batch.tax || 0),
                expiryDate: batch.expiryDate,
                manufacturingDate: batch.manufacturingDate || '',
                unit: batch.unit || 'Unit'
            });

            remaining -= takeQty;
        }

        return {
            success: true,
            allocations,
            totalAllocated: requestedQuantity,
            availableStock: totalAvailableStock
        };
    },

    /**
     * Calculate Expiry Status dynamically
     * EXPIRED: < 0 days
     * CRITICAL: 0 - 7 days
     * WARNING: 8 - 30 days
     * UPCOMING: 31 - 90 days
     * SAFE: > 90 days
     */
    calculateExpiryStatus(expiryDateStr, warningDays = 30, criticalDays = 7) {
        if (!expiryDateStr) {
            return { status: 'SAFE', daysRemaining: 999, badgeClass: 'badge-success', label: 'SAFE' };
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const exp = new Date(expiryDateStr);
        exp.setHours(23, 59, 59, 999);

        const diffTime = exp.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
            return {
                status: 'EXPIRED',
                daysRemaining,
                daysExpired: Math.abs(daysRemaining),
                badgeClass: 'badge-danger',
                label: 'EXPIRED'
            };
        } else if (daysRemaining <= criticalDays) {
            return {
                status: 'CRITICAL',
                daysRemaining,
                badgeClass: 'badge-danger',
                label: `CRITICAL (${daysRemaining}d)`
            };
        } else if (daysRemaining <= warningDays) {
            return {
                status: 'WARNING',
                daysRemaining,
                badgeClass: 'badge-warning',
                label: `WARNING (${daysRemaining}d)`
            };
        } else if (daysRemaining <= 90) {
            return {
                status: 'UPCOMING',
                daysRemaining,
                badgeClass: 'badge-info',
                label: `UPCOMING (${daysRemaining}d)`
            };
        } else {
            return {
                status: 'SAFE',
                daysRemaining,
                badgeClass: 'badge-success',
                label: 'SAFE'
            };
        }
    },

    isExpired(expiryDateStr) {
        const status = this.calculateExpiryStatus(expiryDateStr);
        return status.status === 'EXPIRED';
    },

    getDaysUntilExpiry(expiryDateStr) {
        return this.calculateExpiryStatus(expiryDateStr).daysRemaining;
    },

    /**
     * Calculate Stock Status dynamically for a product
     */
    calculateStockStatus(product) {
        if (!product || !Array.isArray(product.batches)) {
            return { status: 'OUT_OF_STOCK', totalStock: 0, validStock: 0, badgeClass: 'badge-danger', label: 'Out of Stock' };
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let totalStock = 0;
        let validStock = 0;

        product.batches.forEach(b => {
            const qty = Number(b.quantity) || 0;
            totalStock += qty;
            const exp = new Date(b.expiryDate);
            exp.setHours(23, 59, 59, 999);
            if (exp >= now) {
                validStock += qty;
            }
        });

        const reorderLevel = Number(product.reorderLevel) || 20;

        if (validStock === 0) {
            return {
                status: 'OUT_OF_STOCK',
                totalStock,
                validStock,
                badgeClass: 'badge-danger',
                label: 'Out of Stock'
            };
        } else if (validStock <= reorderLevel) {
            return {
                status: 'LOW_STOCK',
                totalStock,
                validStock,
                badgeClass: 'badge-warning',
                label: 'Low Stock'
            };
        } else {
            return {
                status: 'HEALTHY',
                totalStock,
                validStock,
                badgeClass: 'badge-success',
                label: 'In Stock'
            };
        }
    },

    /**
     * Financial Calculations
     * Subtotal - Discount + Tax = Grand Total
     */
    calculateFinancials(subtotal, discountPercent = 0, taxPercent = 0) {
        const sub = Math.max(0, Number(subtotal) || 0);
        const discPct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
        const taxPct = Math.min(100, Math.max(0, Number(taxPercent) || 0));

        const discountAmount = Number(((sub * discPct) / 100).toFixed(2));
        const discountedSubtotal = Math.max(0, Number((sub - discountAmount).toFixed(2)));
        const taxAmount = Number(((discountedSubtotal * taxPct) / 100).toFixed(2));
        const grandTotal = Number((discountedSubtotal + taxAmount).toFixed(2));

        return {
            subtotal: sub,
            discountPercent: discPct,
            discountAmount,
            discountedSubtotal,
            taxPercent: taxPct,
            taxAmount,
            grandTotal
        };
    },

    /**
     * Currency & Date Formatters
     */
    formatCurrency(amount, symbol = null) {
        if (symbol === null) {
            const settings = Storage.get(STORAGE_KEYS.SETTINGS, {});
            symbol = settings?.currencySymbol || '$';
        }
        const num = Number(amount) || 0;
        return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },

    formatDate(dateStr, includeTime = false) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }

        return d.toLocaleDateString('en-US', options);
    },

    getTimeAgo(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Recently';

        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return d.toLocaleDateString('en-US');
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    debounce(func, delay = 250) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    },

    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    },

    generateInvoiceNumber(prefix = 'INV', nextNumber = 1) {
        return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
    }
};

window.Utils = Utils;

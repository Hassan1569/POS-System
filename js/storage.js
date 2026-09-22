/**
 * PharmaCare - Storage Management Module
 * Centralizes all LocalStorage operations, schema defaults, and data migrations.
 */

const STORAGE_KEYS = {
    USERS: 'pharmacy_users',
    PRODUCTS: 'pharmacy_products',
    SALES: 'pharmacy_sales',
    CATEGORIES: 'pharmacy_categories',
    SETTINGS: 'pharmacy_settings',
    CURRENT_USER: 'pharmacy_current_user',
    INITIALIZED: 'pharmacy_data_initialized',
    NEXT_PRODUCT_ID: 'pharmacy_next_product_id',
    NEXT_SALE_ID: 'pharmacy_next_sale_id',
    NEXT_INVOICE: 'pharmacy_next_invoice',
    ACTIVE_CART: 'pharmacy_active_cart'
};

const Storage = {
    get(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return defaultValue;
            return JSON.parse(raw);
        } catch (err) {
            console.error(`[Storage.get] Error reading key "${key}":`, err);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error(`[Storage.set] Error writing key "${key}":`, err);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (err) {
            console.error(`[Storage.remove] Error removing key "${key}":`, err);
            return false;
        }
    },

    clearAll() {
        try {
            localStorage.clear();
            return true;
        } catch (err) {
            console.error('[Storage.clearAll] Error clearing storage:', err);
            return false;
        }
    },

    migrateData() {
        // Normalize data from earlier versions without destroying existing records.
        const products = this.get(STORAGE_KEYS.PRODUCTS, []);
        if (Array.isArray(products)) {
            products.forEach(product => {
                product.batches = Array.isArray(product.batches) ? product.batches : [];
                product.batches.forEach(batch => {
                    batch.id = batch.id || batch.batchNumber || `batch_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
                    batch.quantity = Math.max(0, Number(batch.quantity) || 0);
                    batch.purchasePrice = Math.max(0, Number(batch.purchasePrice) || 0);
                    batch.sellingPrice = Math.max(0, Number(batch.sellingPrice) || 0);
                    batch.mrp = Math.max(batch.sellingPrice, Number(batch.mrp) || batch.sellingPrice);
                });
                product.reorderLevel = Math.max(0, Number(product.reorderLevel ?? product.minStock ?? 0));
                product.minStock = Math.max(0, Number(product.minStock ?? 0));
                product.updatedAt = product.updatedAt || product.createdAt || new Date().toISOString();
            });
            this.set(STORAGE_KEYS.PRODUCTS, products);
        }

        const sales = this.get(STORAGE_KEYS.SALES, []);
        if (Array.isArray(sales)) {
            sales.forEach(sale => {
                sale.items = Array.isArray(sale.items) ? sale.items : [];
                sale.items.forEach(item => {
                    item.subtotal = Number(item.subtotal ?? item.total ?? ((Number(item.quantity)||0) * (Number(item.unitPrice)||0)));
                    item.total = item.subtotal;
                    item.batchId = item.batchId || item.batchNumber;
                });
                sale.discountPercent = Number(sale.discountPercent ?? sale.discount ?? 0);
                sale.discount = sale.discountPercent;
                sale.taxPercent = Number(sale.taxPercent ?? 0);
                sale.taxAmount = Number(sale.taxAmount ?? 0);
                sale.grandTotal = Number(sale.grandTotal ?? 0);
            });
            this.set(STORAGE_KEYS.SALES, sales);
        }

        const users = this.get(STORAGE_KEYS.USERS, []);
        if (Array.isArray(users)) {
            users.forEach(user => {
                user.role = String(user.role || 'shopkeeper').toLowerCase();
                user.active = user.active !== false;
            });
            this.set(STORAGE_KEYS.USERS, users);
        }

        if (!this.get(STORAGE_KEYS.NEXT_PRODUCT_ID, null)) {
            const maxId = (products || []).reduce((m,p) => Math.max(m, Number(p.id) || 0), 0);
            this.set(STORAGE_KEYS.NEXT_PRODUCT_ID, maxId + 1);
        }
        if (!this.get(STORAGE_KEYS.NEXT_SALE_ID, null)) {
            const maxId = (sales || []).reduce((m,s) => Math.max(m, Number(s.id) || 0), 0);
            this.set(STORAGE_KEYS.NEXT_SALE_ID, maxId + 1);
        }
        if (!this.get(STORAGE_KEYS.NEXT_INVOICE, null)) {
            this.set(STORAGE_KEYS.NEXT_INVOICE, (sales || []).length + 1);
        }
    },

    // Initialize all data stores with realistic sample data if not already initialized
    init() {
        // Check if data is already initialized
        this.migrateData();
        const isInit = this.get(STORAGE_KEYS.INITIALIZED, false);
        if (isInit) {
            // Ensure compatibility fixes for existing storage
            this.ensureDefaultUsers();
            this.ensureDefaultCategories();
            this.ensureDefaultSettings();
            return;
        }

        // 1. Categories
        const defaultCategories = [
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
        this.set(STORAGE_KEYS.CATEGORIES, defaultCategories);

        // 2. Default Users (Admin & Shopkeeper)
        const defaultUsers = [
            {
                id: 1,
                name: 'Admin User',
                email: 'admin@pharmacy.com',
                password: 'admin123',
                role: 'admin',
                phone: '+1 (555) 019-2831',
                active: true,
                createdAt: '2024-01-01T08:00:00.000Z'
            },
            {
                id: 2,
                name: 'Shopkeeper / Cashier',
                email: 'shopkeeper@pharmacy.com',
                password: 'shop123',
                role: 'shopkeeper',
                phone: '+1 (555) 019-2832',
                active: true,
                createdAt: '2024-01-15T09:30:00.000Z'
            }
        ];
        this.set(STORAGE_KEYS.USERS, defaultUsers);

        // 3. Realistic Products with Multiple Batches & Various Expiry/Stock States
        const defaultProducts = [
            {
                id: 1,
                name: 'Paracetamol 500mg',
                genericName: 'Paracetamol',
                brand: 'Panadol',
                sku: 'PCM-500',
                barcode: '1234567890001',
                category: 'Pain Relief',
                type: 'Tablet',
                manufacturer: 'GSK Pharmaceuticals',
                description: 'Rapid pain relief and antipyretic for mild to moderate pain and fever.',
                prescriptionRequired: false,
                supplier: 'MediSupply Co.',
                supplierContact: '+1234567890',
                storageInstructions: 'Store below 25°C in dry place',
                batches: [
                    {
                        id: 'batch_pcm_1',
                        batchNumber: 'PCM-2024-A',
                        quantity: 50,
                        purchasePrice: 40.00,
                        sellingPrice: 55.00,
                        mrp: 60.00,
                        tax: 5,
                        manufacturingDate: '2024-01-10',
                        expiryDate: '2026-10-15',
                        unit: 'Strip'
                    },
                    {
                        id: 'batch_pcm_2',
                        batchNumber: 'PCM-2024-B',
                        quantity: 100,
                        purchasePrice: 42.00,
                        sellingPrice: 58.00,
                        mrp: 65.00,
                        tax: 5,
                        manufacturingDate: '2024-06-15',
                        expiryDate: '2027-05-20',
                        unit: 'Strip'
                    }
                ],
                minStock: 30,
                reorderLevel: 60,
                createdAt: '2024-01-15T10:00:00.000Z',
                updatedAt: '2024-06-20T11:00:00.000Z'
            },
            {
                id: 2,
                name: 'Augmentin 625mg',
                genericName: 'Amoxicillin + Clavulanic Acid',
                brand: 'Augmentin',
                sku: 'AUG-625',
                barcode: '1234567890002',
                category: 'Antibiotics',
                type: 'Tablet',
                manufacturer: 'GSK Pharmaceuticals',
                description: 'Broad spectrum penicillin antibiotic for bacterial infections.',
                prescriptionRequired: true,
                supplier: 'Apex Healthcare Distribution',
                supplierContact: '+1234567891',
                storageInstructions: 'Store in moisture-proof pack below 25°C',
                batches: [
                    {
                        id: 'batch_aug_1',
                        batchNumber: 'AUG-091',
                        quantity: 45,
                        purchasePrice: 210.00,
                        sellingPrice: 260.00,
                        mrp: 280.00,
                        tax: 5,
                        manufacturingDate: '2024-03-01',
                        expiryDate: '2026-11-30',
                        unit: 'Strip'
                    }
                ],
                minStock: 20,
                reorderLevel: 40,
                createdAt: '2024-02-10T12:00:00.000Z',
                updatedAt: '2024-02-10T12:00:00.000Z'
            },
            {
                id: 3,
                name: 'Brufen 400mg',
                genericName: 'Ibuprofen',
                brand: 'Brufen',
                sku: 'BRU-400',
                barcode: '1234567890003',
                category: 'Pain Relief',
                type: 'Tablet',
                manufacturer: 'Abbott Laboratories',
                description: 'NSAID for inflammatory conditions and acute pain management.',
                prescriptionRequired: false,
                supplier: 'MediSupply Co.',
                supplierContact: '+1234567890',
                storageInstructions: 'Store at room temperature',
                batches: [
                    {
                        id: 'batch_bru_1',
                        batchNumber: 'BRU-001',
                        quantity: 12,
                        purchasePrice: 85.00,
                        sellingPrice: 110.00,
                        mrp: 120.00,
                        tax: 5,
                        manufacturingDate: '2024-01-10',
                        expiryDate: '2026-12-15',
                        unit: 'Strip'
                    }
                ],
                minStock: 25,
                reorderLevel: 35, // Low stock product
                createdAt: '2024-01-18T10:30:00.000Z',
                updatedAt: '2024-01-18T10:30:00.000Z'
            },
            {
                id: 4,
                name: 'Disprin 300mg Soluble',
                genericName: 'Aspirin (Acetylsalicylic Acid)',
                brand: 'Disprin',
                sku: 'DSP-300',
                barcode: '1234567890004',
                category: 'Pain Relief',
                type: 'Tablet',
                manufacturer: 'Reckitt Benckiser',
                description: 'Fast acting effervescent pain relief and cardiovascular prophylaxis.',
                prescriptionRequired: false,
                supplier: 'National Med Lines',
                supplierContact: '+1234567892',
                storageInstructions: 'Store in dry place, protect from humidity',
                batches: [
                    {
                        id: 'batch_dsp_1',
                        batchNumber: 'DSP-101',
                        quantity: 6,
                        purchasePrice: 35.00,
                        sellingPrice: 48.00,
                        mrp: 52.00,
                        tax: 5,
                        manufacturingDate: '2024-04-10',
                        expiryDate: '2026-09-28', // Expiring very soon! (~6 days critical)
                        unit: 'Strip'
                    },
                    {
                        id: 'batch_dsp_2',
                        batchNumber: 'DSP-102',
                        quantity: 40,
                        purchasePrice: 38.00,
                        sellingPrice: 50.00,
                        mrp: 55.00,
                        tax: 5,
                        manufacturingDate: '2024-05-15',
                        expiryDate: '2027-04-30',
                        unit: 'Strip'
                    }
                ],
                minStock: 20,
                reorderLevel: 30,
                createdAt: '2024-02-01T09:00:00.000Z',
                updatedAt: '2024-05-20T14:00:00.000Z'
            },
            {
                id: 5,
                name: 'Vitamin C 500mg Chewable',
                genericName: 'Ascorbic Acid',
                brand: 'Cevit',
                sku: 'VTC-500',
                barcode: '1234567890005',
                category: 'Vitamins & Supplements',
                type: 'Tablet',
                manufacturer: 'Bayer Health',
                description: 'Antioxidant and immune defense support chewable tablets.',
                prescriptionRequired: false,
                supplier: 'Wellness Distributors',
                supplierContact: '+1234567893',
                storageInstructions: 'Keep bottle tightly sealed',
                batches: [
                    {
                        id: 'batch_vtc_1',
                        batchNumber: 'VTC-882',
                        quantity: 120,
                        purchasePrice: 90.00,
                        sellingPrice: 125.00,
                        mrp: 140.00,
                        tax: 5,
                        manufacturingDate: '2024-02-20',
                        expiryDate: '2026-10-18', // ~26 days warning
                        unit: 'Bottle'
                    }
                ],
                minStock: 30,
                reorderLevel: 50,
                createdAt: '2024-02-22T08:00:00.000Z',
                updatedAt: '2024-02-22T08:00:00.000Z'
            },
            {
                id: 6,
                name: 'ORS Oral Rehydration Salts',
                genericName: 'Oral Electrolyte Powder',
                brand: 'Hydralyte',
                sku: 'ORS-001',
                barcode: '1234567890006',
                category: 'OTC Medicines',
                type: 'Other',
                manufacturer: 'Searle Pharma',
                description: 'WHO formula oral rehydration salt for dehydration and electrolyte loss.',
                prescriptionRequired: false,
                supplier: 'National Med Lines',
                supplierContact: '+1234567892',
                storageInstructions: 'Store in dry place',
                batches: [
                    {
                        id: 'batch_ors_1',
                        batchNumber: 'ORS-220',
                        quantity: 180,
                        purchasePrice: 15.00,
                        sellingPrice: 22.00,
                        mrp: 25.00,
                        tax: 5,
                        manufacturingDate: '2024-01-05',
                        expiryDate: '2027-08-30',
                        unit: 'Piece'
                    }
                ],
                minStock: 50,
                reorderLevel: 100,
                createdAt: '2024-01-10T11:00:00.000Z',
                updatedAt: '2024-01-10T11:00:00.000Z'
            },
            {
                id: 7,
                name: 'Cough Syrup Expectorant 120ml',
                genericName: 'Dextromethorphan + Guaifenesin',
                brand: 'PulmoClear',
                sku: 'CP-120',
                barcode: '1234567890007',
                category: 'Syrups',
                type: 'Syrup',
                manufacturer: 'Pharmatec Labs',
                description: 'Relief of wet and dry cough, chest congestion and throat irritation.',
                prescriptionRequired: false,
                supplier: 'MediSupply Co.',
                supplierContact: '+1234567890',
                storageInstructions: 'Keep in dark cool place',
                batches: [
                    {
                        id: 'batch_cs_1',
                        batchNumber: 'CS-441',
                        quantity: 28,
                        purchasePrice: 130.00,
                        sellingPrice: 175.00,
                        mrp: 190.00,
                        tax: 5,
                        manufacturingDate: '2024-03-10',
                        expiryDate: '2026-11-15',
                        unit: 'Bottle'
                    }
                ],
                minStock: 20,
                reorderLevel: 30,
                createdAt: '2024-03-12T10:00:00.000Z',
                updatedAt: '2024-03-12T10:00:00.000Z'
            },
            {
                id: 8,
                name: 'Insulin Glargine 100 IU/ml',
                genericName: 'Insulin Glargine (rDNA origin)',
                brand: 'Lantus SoloStar',
                sku: 'INS-GLAR',
                barcode: '1234567890008',
                category: 'Diabetes Care',
                type: 'Injection',
                manufacturer: 'Sanofi Aventis',
                description: '24-hour basal blood glucose control for type 1 & 2 diabetes.',
                prescriptionRequired: true,
                supplier: 'Specialty ColdChain Logistics',
                supplierContact: '+1234567894',
                storageInstructions: 'Store refrigerated 2°C to 8°C. Do not freeze.',
                batches: [
                    {
                        id: 'batch_ins_1',
                        batchNumber: 'INS-771',
                        quantity: 15,
                        purchasePrice: 2200.00,
                        sellingPrice: 2650.00,
                        mrp: 2800.00,
                        tax: 5,
                        manufacturingDate: '2024-05-01',
                        expiryDate: '2026-12-31',
                        unit: 'Vial'
                    }
                ],
                minStock: 10,
                reorderLevel: 20,
                createdAt: '2024-05-05T09:00:00.000Z',
                updatedAt: '2024-05-05T09:00:00.000Z'
            },
            {
                id: 9,
                name: 'Digital Clinical Thermometer',
                genericName: 'Electronic Oral/Axillary Thermometer',
                brand: 'Omron Eco Temp',
                sku: 'DEV-THM-01',
                barcode: '1234567890009',
                category: 'Medical Devices',
                type: 'Device',
                manufacturer: 'Omron Healthcare',
                description: 'Fast 60-second fever measurement with beeper sound and memory.',
                prescriptionRequired: false,
                supplier: 'MedEquip Importers',
                supplierContact: '+1234567895',
                storageInstructions: 'Dry protective casing',
                batches: [
                    {
                        id: 'batch_thm_1',
                        batchNumber: 'THM-2024',
                        quantity: 35,
                        purchasePrice: 320.00,
                        sellingPrice: 450.00,
                        mrp: 490.00,
                        tax: 12,
                        manufacturingDate: '2024-01-01',
                        expiryDate: '2029-01-01',
                        unit: 'Piece'
                    }
                ],
                minStock: 15,
                reorderLevel: 25,
                createdAt: '2024-01-10T12:00:00.000Z',
                updatedAt: '2024-01-10T12:00:00.000Z'
            },
            {
                id: 10,
                name: 'Sterile Surgical Gloves 7.5',
                genericName: 'Powder-Free Latex Gloves',
                brand: 'SurgiSafe',
                sku: 'GLV-75',
                barcode: '1234567890010',
                category: 'Surgical Items',
                type: 'Other',
                manufacturer: 'Ansell Healthcare',
                description: 'Medical grade anatomical surgical latex gloves pair.',
                prescriptionRequired: false,
                supplier: 'MedEquip Importers',
                supplierContact: '+1234567895',
                storageInstructions: 'Store in dark dry place away from heat',
                batches: [
                    {
                        id: 'batch_glv_1',
                        batchNumber: 'GLV-902',
                        quantity: 0, // Out of stock
                        purchasePrice: 60.00,
                        sellingPrice: 90.00,
                        mrp: 100.00,
                        tax: 12,
                        manufacturingDate: '2023-11-01',
                        expiryDate: '2026-11-01',
                        unit: 'Box'
                    }
                ],
                minStock: 25,
                reorderLevel: 50, // Out of stock product
                createdAt: '2023-11-15T08:00:00.000Z',
                updatedAt: '2024-06-01T10:00:00.000Z'
            },
            {
                id: 11,
                name: '3-Ply Surgical Face Masks (Box of 50)',
                genericName: 'Medical Face Masks BFE > 98%',
                brand: 'MedProtect',
                sku: 'MSK-3PLY',
                barcode: '1234567890011',
                category: 'Surgical Items',
                type: 'Other',
                manufacturer: '3M Medical Care',
                description: 'Certified fluid resistant hypoallergenic triple-layer filtration mask.',
                prescriptionRequired: false,
                supplier: 'MedEquip Importers',
                supplierContact: '+1234567895',
                storageInstructions: 'Store at room temperature',
                batches: [
                    {
                        id: 'batch_msk_1',
                        batchNumber: 'MSK-550',
                        quantity: 65,
                        purchasePrice: 350.00,
                        sellingPrice: 480.00,
                        mrp: 520.00,
                        tax: 12,
                        manufacturingDate: '2024-04-10',
                        expiryDate: '2027-04-10',
                        unit: 'Box'
                    }
                ],
                minStock: 20,
                reorderLevel: 40,
                createdAt: '2024-04-15T11:00:00.000Z',
                updatedAt: '2024-04-15T11:00:00.000Z'
            },
            {
                id: 12,
                name: 'Elastic Crepe Bandage 10cm x 4.5m',
                genericName: 'Cotton Crepe Compression Bandage',
                brand: 'BandFix',
                sku: 'BND-10CM',
                barcode: '1234567890012',
                category: 'First Aid',
                type: 'Other',
                manufacturer: 'Johnson & Johnson',
                description: 'Supportive dressing for sprains, strains, and joint stabilization.',
                prescriptionRequired: false,
                supplier: 'National Med Lines',
                supplierContact: '+1234567892',
                storageInstructions: 'Store clean and dry',
                batches: [
                    {
                        id: 'batch_bnd_1',
                        batchNumber: 'BND-110',
                        quantity: 85,
                        purchasePrice: 75.00,
                        sellingPrice: 110.00,
                        mrp: 125.00,
                        tax: 5,
                        manufacturingDate: '2024-02-01',
                        expiryDate: '2029-02-01',
                        unit: 'Piece'
                    }
                ],
                minStock: 20,
                reorderLevel: 40,
                createdAt: '2024-02-05T13:00:00.000Z',
                updatedAt: '2024-02-05T13:00:00.000Z'
            },
            {
                id: 13,
                name: 'Antiseptic Disinfectant Liquid 500ml',
                genericName: 'Chloroxylenol Antiseptic Solution',
                brand: 'Dettol Care',
                sku: 'ANT-500ML',
                barcode: '1234567890013',
                category: 'First Aid',
                type: 'Other',
                manufacturer: 'Reckitt Benckiser',
                description: 'Concentrated antiseptic for wound cleansing and personal hygiene.',
                prescriptionRequired: false,
                supplier: 'Wellness Distributors',
                supplierContact: '+1234567893',
                storageInstructions: 'Keep away from direct heat and children',
                batches: [
                    {
                        id: 'batch_ant_1',
                        batchNumber: 'ANT-331',
                        quantity: 40,
                        purchasePrice: 280.00,
                        sellingPrice: 360.00,
                        mrp: 390.00,
                        tax: 12,
                        manufacturingDate: '2024-03-15',
                        expiryDate: '2027-03-15',
                        unit: 'Bottle'
                    }
                ],
                minStock: 15,
                reorderLevel: 30,
                createdAt: '2024-03-20T10:00:00.000Z',
                updatedAt: '2024-03-20T10:00:00.000Z'
            },
            {
                id: 14,
                name: 'Ceftriaxone 1g IV/IM Injection (Expired Demo)',
                genericName: 'Ceftriaxone Sodium',
                brand: 'Rocephin',
                sku: 'INJ-CEF-1G',
                barcode: '1234567890014',
                category: 'Injections',
                type: 'Injection',
                manufacturer: 'Roche Pharma',
                description: 'Third-generation cephalosporin for severe hospital infections (Audit batch).',
                prescriptionRequired: true,
                supplier: 'Apex Healthcare Distribution',
                supplierContact: '+1234567891',
                storageInstructions: 'Store below 25°C protected from light',
                batches: [
                    {
                        id: 'batch_cef_exp',
                        batchNumber: 'CEF-EXP-24',
                        quantity: 18,
                        purchasePrice: 380.00,
                        sellingPrice: 490.00,
                        mrp: 530.00,
                        tax: 5,
                        manufacturingDate: '2023-01-10',
                        expiryDate: '2024-05-15', // Truly expired
                        unit: 'Vial'
                    }
                ],
                minStock: 10,
                reorderLevel: 25,
                createdAt: '2023-01-20T08:00:00.000Z',
                updatedAt: '2024-05-16T09:00:00.000Z'
            }
        ];
        this.set(STORAGE_KEYS.PRODUCTS, defaultProducts);

        // 4. Default Sales Transactions
        const defaultSales = [
            {
                id: 1,
                invoiceNumber: 'INV-000001',
                date: '2026-09-21T14:30:00.000Z',
                customerName: 'Muhammad Ali',
                customerPhone: '+1 (555) 345-6789',
                doctorName: 'Dr. Tariq Khan',
                prescriptionNumber: 'RX-9042',
                cashier: 'Admin User',
                items: [
                    {
                        productId: 1,
                        productName: 'Paracetamol 500mg',
                        batchNumber: 'PCM-2024-A',
                        quantity: 4,
                        unitPrice: 55.00,
                        subtotal: 220.00,
                        unit: 'Strip'
                    },
                    {
                        productId: 6,
                        productName: 'ORS Oral Rehydration Salts',
                        batchNumber: 'ORS-220',
                        quantity: 2,
                        unitPrice: 22.00,
                        subtotal: 44.00,
                        unit: 'Piece'
                    }
                ],
                subtotal: 264.00,
                discountPercent: 5,
                discountAmount: 13.20,
                taxPercent: 5,
                taxAmount: 12.54,
                grandTotal: 263.34,
                paymentMethod: 'Cash',
                status: 'Completed'
            }
        ];
        this.set(STORAGE_KEYS.SALES, defaultSales);

        // 5. System & Pharmacy Settings
        const defaultSettings = {
            pharmacyName: 'PharmaCare Medical & Health Store',
            address: 'Suite 400, Healthcare Boulevard, Metro City',
            phone: '+1 (555) 019-2830',
            email: 'care@pharmacare.com',
            ntn: 'REG-98765432-PH',
            currency: 'USD',
            currencySymbol: '$',
            defaultTax: 5,
            defaultDiscount: 0,
            invoicePrefix: 'INV',
            lowStockThreshold: 25,
            expiryWarningDays: 30,
            criticalExpiryDays: 7
        };
        this.set(STORAGE_KEYS.SETTINGS, defaultSettings);

        // Counters
        this.set(STORAGE_KEYS.NEXT_PRODUCT_ID, 15);
        this.set(STORAGE_KEYS.NEXT_SALE_ID, 2);
        this.set(STORAGE_KEYS.NEXT_INVOICE, 2);
        this.set(STORAGE_KEYS.INITIALIZED, true);

        console.log('[Storage.init] PharmaCare database initialized successfully.');
    },

    ensureDefaultUsers() {
        const users = this.get(STORAGE_KEYS.USERS, []);
        if (!users || users.length === 0) {
            const defaultUsers = [
                {
                    id: 1,
                    name: 'Admin User',
                    email: 'admin@pharmacy.com',
                    password: 'admin123',
                    role: 'admin',
                    phone: '+1 (555) 019-2831',
                    active: true,
                    createdAt: '2024-01-01T08:00:00.000Z'
                },
                {
                    id: 2,
                    name: 'Shopkeeper / Cashier',
                    email: 'shopkeeper@pharmacy.com',
                    password: 'shop123',
                    role: 'shopkeeper',
                    phone: '+1 (555) 019-2832',
                    active: true,
                    createdAt: '2024-01-15T09:30:00.000Z'
                }
            ];
            this.set(STORAGE_KEYS.USERS, defaultUsers);
        }
    },

    ensureDefaultCategories() {
        const categories = this.get(STORAGE_KEYS.CATEGORIES, []);
        if (!categories || categories.length === 0) {
            const defaultCategories = [
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
            this.set(STORAGE_KEYS.CATEGORIES, defaultCategories);
        }
    },

    ensureDefaultSettings() {
        const settings = this.get(STORAGE_KEYS.SETTINGS, null);
        if (!settings) {
            const defaultSettings = {
                pharmacyName: 'PharmaCare Medical & Health Store',
                address: 'Suite 400, Healthcare Boulevard, Metro City',
                phone: '+1 (555) 019-2830',
                email: 'care@pharmacare.com',
                ntn: 'REG-98765432-PH',
                currency: 'USD',
                currencySymbol: '$',
                defaultTax: 5,
                defaultDiscount: 0,
                invoicePrefix: 'INV',
                lowStockThreshold: 25,
                expiryWarningDays: 30,
                criticalExpiryDays: 7
            };
            this.set(STORAGE_KEYS.SETTINGS, defaultSettings);
        }
    }
};

// Global export
window.Storage = Storage;
window.STORAGE_KEYS = STORAGE_KEYS;

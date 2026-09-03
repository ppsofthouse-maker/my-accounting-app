// Local Data State Manager
let appState = {
    billingMode: 'Sales', // Sales or Purchase
    currentInvoiceItems: [],
    activeSheetTab: 'Sales', // Active tab for Excel Reports Modal
    customers: JSON.parse(localStorage.getItem('pp_customers')) || [
        { id: 'CUST-1', name: 'Cash Customer', phone: '0300-0000000', balance: 0 },
        { id: 'CUST-2', name: 'Ahmed Graphic Printers', phone: '0321-1234567', balance: 15000 }
    ],
    products: JSON.parse(localStorage.getItem('pp_products')) || [
        { id: 'PROD-1', name: 'Flex Printing (Sqft)', category: 'Printing', barcode: '1001', rate: 45 },
        { id: 'PROD-2', name: 'Visiting Cards (1000 Box)', category: 'Stationery', barcode: '1002', rate: 1200 }
    ],
    banks: JSON.parse(localStorage.getItem('pp_banks')) || [
        { id: 'BANK-1', bankName: 'Meezan Bank', title: 'PP Printer', accNo: '0101-01020304', balance: 125000 },
        { id: 'BANK-2', bankName: 'Cash in Hand', title: 'Counter Cash', accNo: 'CASH', balance: 25000 }
    ],
    expenses: JSON.parse(localStorage.getItem('pp_expenses')) || [
        { id: 'EXP-1', date: new Date().toLocaleDateString('en-GB'), title: 'Shop Rent', category: 'Office Expense', bank: 'Meezan Bank', amount: 25000 }
    ],
    salesInvoices: JSON.parse(localStorage.getItem('pp_sales_inv')) || [],
    purchaseInvoices: JSON.parse(localStorage.getItem('pp_purch_inv')) || [],
    categories: ['Printing', 'Paper Stock', 'Advertising', 'Ink & Chemicals', 'Office Expense'],
    printFormat: 'A4'
};

// Admin System Login Control
function verifyAdminLogin() {
    const pass = document.getElementById('adminPasswordInput').value;
    if (pass === "1234" || pass === "admin") {
        document.getElementById('adminLoginModal').classList.remove('modal-active');
        document.getElementById('adminLoginError').style.display = 'none';
    } else {
        document.getElementById('adminLoginError').style.display = 'block';
    }
}

function lockAdminSession() {
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminLoginModal').classList.add('modal-active');
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initDropdowns();
    updateDashboardKPIs();
    renderCurrentInvoice();
    document.getElementById('invDate').innerText = `Date: ${new Date().toLocaleDateString('en-GB')}`;
});

function saveDataToLocalStorage() {
    localStorage.setItem('pp_customers', JSON.stringify(appState.customers));
    localStorage.setItem('pp_products', JSON.stringify(appState.products));
    localStorage.setItem('pp_banks', JSON.stringify(appState.banks));
    localStorage.setItem('pp_expenses', JSON.stringify(appState.expenses));
    localStorage.setItem('pp_sales_inv', JSON.stringify(appState.salesInvoices));
    localStorage.setItem('pp_purch_inv', JSON.stringify(appState.purchaseInvoices));
}

function initDropdowns() {
    // Populate Customers
    const custSelect = document.getElementById('billCustSelect');
    const payCustSelect = document.getElementById('payReceiveCustSelect');
    if (custSelect) custSelect.innerHTML = '';
    if (payCustSelect) payCustSelect.innerHTML = '';
    
    appState.customers.forEach(c => {
        if (custSelect) custSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.phone || 'No Phone'})</option>`;
        if (payCustSelect) payCustSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    // Populate Products
    const itemSelect = document.getElementById('billItemSelect');
    if (itemSelect) {
        itemSelect.innerHTML = '<option value="">-- Choose Item --</option>';
        appState.products.forEach(p => {
            itemSelect.innerHTML += `<option value="${p.id}">${p.name} - ${p.rate} PKR</option>`;
        });
    }

    // Populate Banks
    const bankSelects = [document.getElementById('invoiceTargetBank'), document.getElementById('expenseBankSelect'), document.getElementById('khataBankSelect')];
    bankSelects.forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        appState.banks.forEach(b => {
            select.innerHTML += `<option value="${b.id}">${b.bankName} - ${b.title}</option>`;
        });
    });

    // Populate Categories
    const catSelect = document.getElementById('itemCatSelect');
    const expCatSelect = document.getElementById('expenseCategorySelect');
    if (catSelect) catSelect.innerHTML = '';
    if (expCatSelect) expCatSelect.innerHTML = '';
    
    appState.categories.forEach(cat => {
        if (catSelect) catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        if (expCatSelect) expCatSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    onCustomerSelectChange();
}

function onCustomerSelectChange() {
    const custSelect = document.getElementById('billCustSelect');
    if (!custSelect) return;
    
    const custId = custSelect.value;
    const cust = appState.customers.find(c => c.id === custId);
    if (cust) {
        document.getElementById('selectedCustBalanceText').innerText = `${cust.balance.toFixed(2)} PKR`;
        document.getElementById('invCustomerInfo').innerText = `Billed To: ${cust.name} | Phone: ${cust.phone || 'N/A'}`;
    } else {
        document.getElementById('selectedCustBalanceText').innerText = `0.00 PKR`;
        document.getElementById('invCustomerInfo').innerText = `Billed To: Cash Customer`;
    }
    calculateInvoiceSummary();
}

function autoFillRate() {
    const prodId = document.getElementById('billItemSelect').value;
    const prod = appState.products.find(p => p.id === prodId);
    if (prod) {
        document.getElementById('billRate').value = prod.rate;
    }
}

function switchBillingMode(mode) {
    appState.billingMode = mode;
    document.getElementById('pillSales').classList.toggle('active', mode === 'Sales');
    document.getElementById('pillPurchase').classList.toggle('active', mode === 'Purchase');
    document.getElementById('invTypeBadge').innerText = mode === 'Sales' ? 'SALES INVOICE' : 'PURCHASE INVOICE';
    document.getElementById('lblPartySelect').innerText = mode === 'Sales' ? 'Customer Account Profile' : 'Supplier Account Profile';
}

function addItemToCurrentInvoice() {
    const itemSelect = document.getElementById('billItemSelect');
    const prodId = itemSelect.value;
    const rate = parseFloat(document.getElementById('billRate').value) || 0;
    const qty = parseInt(document.getElementById('billQty').value) || 1;

    if (!prodId) return alert('Please select a product');
    const prod = appState.products.find(p => p.id === prodId);

    appState.currentInvoiceItems.push({
        id: prod.id,
        name: prod.name,
        rate: rate,
        qty: qty,
        amount: rate * qty
    });

    renderCurrentInvoice();
}

function renderCurrentInvoice() {
    const tbody = document.getElementById('invoiceItemsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (appState.currentInvoiceItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 20px;">No items added to current invoice yet.</td></tr>`;
    } else {
        appState.currentInvoiceItems.forEach((item, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${item.name}</td>
                    <td class="text-right">${item.rate.toFixed(2)}</td>
                    <td class="text-center">${item.qty}</td>
                    <td class="text-right">${item.amount.toFixed(2)}</td>
                    <td class="text-center no-print">
                        <button class="btn-delete" onclick="removeItemFromInvoice(${idx})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    calculateInvoiceSummary();
}

function removeItemFromInvoice(index) {
    appState.currentInvoiceItems.splice(index, 1);
    renderCurrentInvoice();
}

function calculateInvoiceSummary() {
    const subtotal = appState.currentInvoiceItems.reduce((acc, item) => acc + item.amount, 0);
    const discVal = parseFloat(document.getElementById('invoiceDiscountVal').value) || 0;
    const discType = document.getElementById('invoiceDiscountType').value;
    const taxPct = parseFloat(document.getElementById('invoiceTaxPercent').value) || 0;
    const received = parseFloat(document.getElementById('previewReceiveAmount').value) || 0;

    let discAmt = discType === '%' ? (subtotal * discVal) / 100 : discVal;
    let taxAmt = ((subtotal - discAmt) * taxPct) / 100;
    let currentBill = subtotal - discAmt + taxAmt;

    const custSelect = document.getElementById('billCustSelect');
    const custId = custSelect ? custSelect.value : null;
    const cust = appState.customers.find(c => c.id === custId);
    let prevBal = cust ? cust.balance : 0;

    let gross = currentBill + prevBal;
    let netPayable = gross - received;

    document.getElementById('summarySubtotal').innerText = `${subtotal.toFixed(2)} PKR`;
    document.getElementById('summaryDiscountAmount').innerText = `${discAmt.toFixed(2)} PKR`;
    document.getElementById('summaryTaxAmount').innerText = `${taxAmt.toFixed(2)} PKR`;
    document.getElementById('summaryCurrentBill').innerText = `${currentBill.toFixed(2)} PKR`;
    document.getElementById('summaryOpeningBalance').innerText = `${prevBal.toFixed(2)} PKR`;
    document.getElementById('summaryGrossBalance').innerText = `${gross.toFixed(2)} PKR`;
    document.getElementById('summaryTotalReceived').innerText = `${received.toFixed(2)} PKR`;
    document.getElementById('summaryNetBalance').innerText = `${netPayable.toFixed(2)} PKR`;
}

function finalizeBillAndSave() {
    if (appState.currentInvoiceItems.length === 0) return alert('Invoice is empty!');
    
    const custId = document.getElementById('billCustSelect').value;
    const cust = appState.customers.find(c => c.id === custId);
    const received = parseFloat(document.getElementById('previewReceiveAmount').value) || 0;
    const currentBill = parseFloat(document.getElementById('summaryCurrentBill').innerText) || 0;
    const invNo = 'INV-' + String(appState.salesInvoices.length + appState.purchaseInvoices.length + 1).padStart(6, '0');
    const today = new Date().toLocaleDateString('en-GB');

    const invData = {
        id: 'INV-' + Date.now(),
        invNo: invNo,
        date: today,
        party: cust ? cust.name : 'Cash Customer',
        amount: currentBill,
        received: received,
        itemsCount: appState.currentInvoiceItems.length
    };

    if (appState.billingMode === 'Sales') {
        appState.salesInvoices.push(invData);
    } else {
        appState.purchaseInvoices.push(invData);
    }

    if (cust) {
        cust.balance = (cust.balance + currentBill) - received;
    }

    alert('Invoice saved successfully!');
    resetInvoice();
    saveDataToLocalStorage();
    initDropdowns();
    updateDashboardKPIs();
}

function resetInvoice() {
    appState.currentInvoiceItems = [];
    document.getElementById('invoiceDiscountVal').value = 0;
    document.getElementById('invoiceTaxPercent').value = 0;
    document.getElementById('previewReceiveAmount').value = 0;
    renderCurrentInvoice();
}

function updateDashboardKPIs() {
    const totalSales = appState.salesInvoices.reduce((a, b) => a + b.amount, 0);
    const totalBank = appState.banks.reduce((a, b) => a + b.balance, 0);
    const totalExp = appState.expenses.reduce((a, b) => a + b.amount, 0);
    const totalRec = appState.customers.reduce((a, b) => a + b.balance, 0);

    document.getElementById('dashTotalSales').innerText = `${totalSales.toFixed(2)} PKR`;
    document.getElementById('dashTotalBank').innerText = `${totalBank.toFixed(2)} PKR`;
    document.getElementById('dashTotalExpenses').innerText = `${totalExp.toFixed(2)} PKR`;
    document.getElementById('dashTotalReceivables').innerText = `${totalRec.toFixed(2)} PKR`;
}

// Add Product & Delete Product System
function addProduct() {
    const name = document.getElementById('itemName').value;
    const cat = document.getElementById('itemCatSelect').value;
    const barcode = document.getElementById('itemBarcode').value;
    const rate = parseFloat(document.getElementById('itemRate').value) || 0;

    if (!name) return alert('Product Name required');

    appState.products.push({
        id: 'PROD-' + Date.now(),
        name: name,
        category: cat,
        barcode: barcode,
        rate: rate
    });

    saveDataToLocalStorage();
    initDropdowns();

    if (appState.activeSheetTab === 'Inventory') {
        switchExcelSheet('Inventory');
    }

    alert('Product Saved!');
    document.getElementById('itemName').value = '';
    document.getElementById('itemBarcode').value = '';
    document.getElementById('itemRate').value = '';
}

function deleteProduct(prodId) {
    if (confirm("Are you sure you want to delete this product from inventory?")) {
        appState.products = appState.products.filter(p => p.id !== prodId);
        saveDataToLocalStorage();
        initDropdowns();
        switchExcelSheet('Inventory');
    }
}

// Customer Master & Delete System
function openCustomerMasterModal() { 
    renderCustomerTable();
    document.getElementById('customerMasterModal').classList.remove('hidden'); 
    document.getElementById('customerMasterModal').classList.add('modal-active'); 
}

function closeCustomerMasterModal() { 
    document.getElementById('customerMasterModal').classList.add('hidden'); 
    document.getElementById('customerMasterModal').classList.remove('modal-active'); 
}

function savePopupCustomerProfile() {
    const name = document.getElementById('popupCustName').value;
    const phone = document.getElementById('popupCustPhone').value;
    const bal = parseFloat(document.getElementById('popupCustOpening').value) || 0;

    if (!name) return alert('Name required!');

    appState.customers.push({
        id: 'CUST-' + Date.now(),
        name: name,
        phone: phone,
        balance: bal
    });

    saveDataToLocalStorage();
    initDropdowns();
    renderCustomerTable();
    updateDashboardKPIs();
    document.getElementById('popupCustName').value = '';
    document.getElementById('popupCustPhone').value = '';
    document.getElementById('popupCustOpening').value = '';
    alert('Customer added!');
}

function renderCustomerTable() {
    const tbody = document.getElementById('customerMasterPopupTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    appState.customers.forEach((c, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone || 'N/A'}</td>
                <td class="text-right">${c.balance.toFixed(2)} PKR</td>
                <td class="text-center">
                    <button class="btn-delete" onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
}

function deleteCustomer(custId) {
    if (confirm("Are you sure you want to delete this customer profile?")) {
        appState.customers = appState.customers.filter(c => c.id !== custId);
        saveDataToLocalStorage();
        initDropdowns();
        renderCustomerTable();
        updateDashboardKPIs();
    }
}

// Bank Accounts System & Delete
function openBankAccountsModal() { 
    renderBankTable();
    document.getElementById('bankModal').classList.remove('hidden'); 
    document.getElementById('bankModal').classList.add('modal-active'); 
}

function closeBankAccountsModal() { 
    document.getElementById('bankModal').classList.add('hidden'); 
    document.getElementById('bankModal').classList.remove('modal-active'); 
}

function addNewBankAccount() {
    const bName = document.getElementById('bankNameInput').value;
    const title = document.getElementById('bankTitleInput').value;
    const accNo = document.getElementById('bankAccNoInput').value;
    const bal = parseFloat(document.getElementById('bankBalanceInput').value) || 0;

    if (!bName || !title) return alert('Fill Bank Name and Title');

    appState.banks.push({
        id: 'BANK-' + Date.now(),
        bankName: bName,
        title: title,
        accNo: accNo,
        balance: bal
    });

    saveDataToLocalStorage();
    initDropdowns();
    renderBankTable();
    updateDashboardKPIs();
    document.getElementById('bankNameInput').value = '';
    document.getElementById('bankTitleInput').value = '';
    document.getElementById('bankAccNoInput').value = '';
    document.getElementById('bankBalanceInput').value = '';
    alert('Bank Account Added!');
}

function renderBankTable() {
    const tbody = document.getElementById('bankAccountsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    appState.banks.forEach((b, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${b.bankName}</strong></td>
                <td>${b.title}</td>
                <td>${b.accNo}</td>
                <td class="text-right">${b.balance.toFixed(2)} PKR</td>
                <td class="text-center">
                    <button class="btn-delete" onclick="deleteBankAccount('${b.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
}

function deleteBankAccount(bankId) {
    if (confirm("Are you sure you want to delete this Bank/Cash Account?")) {
        appState.banks = appState.banks.filter(b => b.id !== bankId);
        saveDataToLocalStorage();
        initDropdowns();
        renderBankTable();
        updateDashboardKPIs();
    }
}

// Expenses System & Delete
function openExpenseModal() { 
    renderExpenseTable();
    document.getElementById('expenseModal').classList.remove('hidden'); 
    document.getElementById('expenseModal').classList.add('modal-active'); 
}

function closeExpenseModal() { 
    document.getElementById('expenseModal').classList.add('hidden'); 
    document.getElementById('expenseModal').classList.remove('modal-active'); 
}

function addNewExpenseRecord() {
    const title = document.getElementById('expenseTitleInput').value;
    const cat = document.getElementById('expenseCategorySelect').value;
    const bankId = document.getElementById('expenseBankSelect').value;
    const amount = parseFloat(document.getElementById('expenseAmountInput').value) || 0;

    if (!title || amount <= 0) return alert('Please fill valid expense details');

    const bank = appState.banks.find(b => b.id === bankId);
    if (bank) {
        bank.balance -= amount;
    }

    appState.expenses.push({
        id: 'EXP-' + Date.now(),
        date: new Date().toLocaleDateString('en-GB'),
        title: title,
        category: cat,
        bank: bank ? bank.bankName : 'Cash',
        amount: amount
    });

    saveDataToLocalStorage();
    renderExpenseTable();
    updateDashboardKPIs();
    document.getElementById('expenseTitleInput').value = '';
    document.getElementById('expenseAmountInput').value = '';
    alert('Expense recorded!');
}

function renderExpenseTable() {
    const tbody = document.getElementById('expensePopupTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let sum = 0;

    appState.expenses.forEach((exp, i) => {
        sum += exp.amount;
        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${exp.date}</td>
                <td>${exp.title} (${exp.category})</td>
                <td class="text-right">${exp.amount.toFixed(2)} PKR</td>
                <td class="text-center">
                    <button class="btn-delete" onclick="deleteExpense('${exp.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
    document.getElementById('totalExpenseAmountSum').innerText = `${sum.toFixed(2)} PKR`;
}

function deleteExpense(expId) {
    if (confirm("Delete this expense record?")) {
        appState.expenses = appState.expenses.filter(e => e.id !== expId);
        saveDataToLocalStorage();
        renderExpenseTable();
        updateDashboardKPIs();
    }
}

// Khata Payment
function openKhataPaymentModal() { document.getElementById('khataPaymentModal').classList.remove('hidden'); document.getElementById('khataPaymentModal').classList.add('modal-active'); }
function closeKhataPaymentModal() { document.getElementById('khataPaymentModal').classList.add('hidden'); document.getElementById('khataPaymentModal').classList.remove('modal-active'); }

function saveKhataPaymentReceipt() {
    const custId = document.getElementById('payReceiveCustSelect').value;
    const bankId = document.getElementById('khataBankSelect').value;
    const amount = parseFloat(document.getElementById('khataReceiveAmount').value) || 0;

    if (amount <= 0) return alert('Enter valid payment amount!');

    const cust = appState.customers.find(c => c.id === custId);
    const bank = appState.banks.find(b => b.id === bankId);

    if (cust) cust.balance -= amount;
    if (bank) bank.balance += amount;

    saveDataToLocalStorage();
    updateDashboardKPIs();
    closeKhataPaymentModal();
    alert('Payment recorded successfully!');
}

// ERP Master Ledger & Reports Functions
function openExcelSheetView() { 
    switchExcelSheet('Sales');
    document.getElementById('excelSheetModal').classList.remove('hidden'); 
    document.getElementById('excelSheetModal').classList.add('modal-active'); 
}

function closeExcelSheetView() { 
    document.getElementById('excelSheetModal').classList.add('hidden'); 
    document.getElementById('excelSheetModal').classList.remove('modal-active'); 
}

function switchExcelSheet(tab) {
    appState.activeSheetTab = tab;

    document.getElementById('sheetTabSales').classList.toggle('active', tab === 'Sales');
    document.getElementById('sheetTabPurchase').classList.toggle('active', tab === 'Purchase');
    document.getElementById('sheetTabInventory').classList.toggle('active', tab === 'Inventory');
    document.getElementById('sheetTabExpenses').classList.toggle('active', tab === 'Expenses');

    const headerRow = document.getElementById('excelSheetHeaderRow');
    const bodyRows = document.getElementById('excelSheetBodyRows');

    if (tab === 'Sales' || tab === 'Purchase') {
        const list = tab === 'Sales' ? appState.salesInvoices : appState.purchaseInvoices;
        headerRow.innerHTML = `
            <th>#</th>
            <th>Invoice No</th>
            <th>Date</th>
            <th>Party Name</th>
            <th class="text-center">Items Count</th>
            <th class="text-right">Total Amount</th>
            <th class="text-right">Received</th>
            <th class="text-center">Action</th>
        `;
        bodyRows.innerHTML = '';
        if (list.length === 0) {
            bodyRows.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 20px;">No ${tab} records available.</td></tr>`;
        } else {
            list.forEach((inv, i) => {
                bodyRows.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td><strong>${inv.invNo}</strong></td>
                        <td>${inv.date}</td>
                        <td>${inv.party}</td>
                        <td class="text-center">${inv.itemsCount}</td>
                        <td class="text-right">${inv.amount.toFixed(2)} PKR</td>
                        <td class="text-right">${inv.received.toFixed(2)} PKR</td>
                        <td class="text-center">
                            <button class="btn-delete" onclick="deleteInvoice('${inv.id}', '${tab}')"><i class="fa-solid fa-trash"></i> Delete</button>
                        </td>
                    </tr>
                `;
            });
        }
    } else if (tab === 'Inventory') {
        headerRow.innerHTML = `
            <th>#</th>
            <th>Product ID</th>
            <th>Product / Item Name</th>
            <th>Category</th>
            <th>Barcode / SKU</th>
            <th class="text-right">Unit Rate</th>
            <th class="text-center">Action</th>
        `;
        bodyRows.innerHTML = '';
        if (appState.products.length === 0) {
            bodyRows.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 20px;">No inventory products found.</td></tr>`;
        } else {
            appState.products.forEach((prod, i) => {
                bodyRows.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${prod.id}</td>
                        <td><strong>${prod.name}</strong></td>
                        <td>${prod.category}</td>
                        <td>${prod.barcode || 'N/A'}</td>
                        <td class="text-right">${prod.rate.toFixed(2)} PKR</td>
                        <td class="text-center">
                            <button class="btn-delete" onclick="deleteProduct('${prod.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                        </td>
                    </tr>
                `;
            });
        }
    } else if (tab === 'Expenses') {
        headerRow.innerHTML = `
            <th>#</th>
            <th>Expense ID</th>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Paid Via Bank</th>
            <th class="text-right">Amount</th>
            <th class="text-center">Action</th>
        `;
        bodyRows.innerHTML = '';
        if (appState.expenses.length === 0) {
            bodyRows.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 20px;">No expense records available.</td></tr>`;
        } else {
            appState.expenses.forEach((exp, i) => {
                bodyRows.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${exp.id}</td>
                        <td>${exp.date}</td>
                        <td><strong>${exp.title}</strong></td>
                        <td>${exp.category}</td>
                        <td>${exp.bank}</td>
                        <td class="text-right">${exp.amount.toFixed(2)} PKR</td>
                        <td class="text-center">
                            <button class="btn-delete" onclick="deleteExpense('${exp.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                        </td>
                    </tr>
                `;
            });
        }
    }
}

function deleteInvoice(invId, type) {
    if (confirm(`Delete this ${type} Invoice record permanently?`)) {
        if (type === 'Sales') {
            appState.salesInvoices = appState.salesInvoices.filter(i => i.id !== invId);
        } else {
            appState.purchaseInvoices = appState.purchaseInvoices.filter(i => i.id !== invId);
        }
        saveDataToLocalStorage();
        switchExcelSheet(type);
        updateDashboardKPIs();
    }
}

function exportActiveExcelSheet() {
    const tab = appState.activeSheetTab;
    let exportData = [];

    if (tab === 'Sales' || tab === 'Purchase') {
        const list = tab === 'Sales' ? appState.salesInvoices : appState.purchaseInvoices;
        exportData = list.map((inv, index) => ({
            "S.No": index + 1,
            "Invoice No": inv.invNo,
            "Date": inv.date,
            "Party Name": inv.party,
            "Items Count": inv.itemsCount,
            "Total Amount (PKR)": inv.amount,
            "Received Amount (PKR)": inv.received
        }));
    } else if (tab === 'Inventory') {
        exportData = appState.products.map((p, index) => ({
            "S.No": index + 1,
            "Product ID": p.id,
            "Product Name": p.name,
            "Category": p.category,
            "Barcode / SKU": p.barcode || '',
            "Unit Rate (PKR)": p.rate
        }));
    } else if (tab === 'Expenses') {
        exportData = appState.expenses.map((e, index) => ({
            "S.No": index + 1,
            "Expense ID": e.id,
            "Date": e.date,
            "Description": e.title,
            "Category": e.category,
            "Bank / Source": e.bank,
            "Amount (PKR)": e.amount
        }));
    }

    if (exportData.length === 0) {
        return alert('No data available to export in this sheet!');
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tab);
    XLSX.writeFile(workbook, `PP_Printer_${tab}_Report.xlsx`);
}

// Print Functions
function openPrintFormatModal() { document.getElementById('printFormatModal').classList.remove('hidden'); document.getElementById('printFormatModal').classList.add('modal-active'); }
function closePrintFormatModal() { document.getElementById('printFormatModal').classList.add('hidden'); document.getElementById('printFormatModal').classList.remove('modal-active'); }

function selectPrintFormat(format) {
    appState.printFormat = format;

    document.getElementById('btnFormatA4').classList.toggle('active', format === 'A4');
    document.getElementById('btnFormatHalfA4').classList.toggle('active', format === 'HalfA4');
    document.getElementById('btnFormatThermal').classList.toggle('active', format === 'Thermal');

    const paper = document.getElementById('printableInvoiceCard');
    if (paper) {
        paper.className = `invoice-paper print-format-${format}`;
    }
}

function executePrintOrPdfAction() {
    closePrintFormatModal();
    
    let existingStyle = document.getElementById('dynamicPrintStyle');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'dynamicPrintStyle';

    if (appState.printFormat === 'Thermal') {
        style.innerHTML = `@page { size: 80mm auto; margin: 0; }`;
    } else if (appState.printFormat === 'HalfA4') {
        style.innerHTML = `@page { size: A5 portrait; margin: 10mm; }`;
    } else {
        style.innerHTML = `@page { size: A4 portrait; margin: 15mm; }`;
    }

    document.head.appendChild(style);
    
    setTimeout(() => {
        window.print();
    }, 150);
}
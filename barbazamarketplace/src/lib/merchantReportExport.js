const REPORT_COLUMNS = [
  'Order ID',
  'Order Date',
  'Customer',
  'Order Status',
  'Payment Method',
  'Payment Status',
  'Product',
  'Quantity',
  'Unit Price',
  'Line Total',
  'Order Total',
];

const normalizeFilename = (value) => String(value || 'merchant')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'merchant';

const dateStamp = () => new Date().toISOString().slice(0, 10);
const formatExportDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-PH');
};
const formatNumber = (value) => Number(Number(value || 0).toFixed(2));

export const buildMerchantReportRows = (orders = []) => orders.flatMap((order) => {
  const items = Array.isArray(order?.store_items) && order.store_items.length > 0
    ? order.store_items
    : (Array.isArray(order?.items) ? order.items : []);
  const base = {
    'Order ID': order?.id || '',
    'Order Date': formatExportDate(order?.created_at),
    Customer: order?.customer?.name || order?.customer?.fullName || order?.customer?.email || '',
    'Order Status': String(order?.status || '').replace(/_/g, ' '),
    'Payment Method': order?.payment_method_label || order?.payment_method || '',
    'Payment Status': String(order?.payment_status || 'unpaid').replace(/_/g, ' '),
    'Order Total': formatNumber(order?.store_subtotal_amount ?? order?.total_amount),
  };

  if (items.length === 0) {
    return [{ ...base, Product: '', Quantity: 0, 'Unit Price': 0, 'Line Total': 0 }];
  }

  return items.map((item) => ({
    ...base,
    Product: item?.name || `Product #${item?.product_id || ''}`,
    Quantity: Number(item?.quantity || 0),
    'Unit Price': formatNumber(item?.price),
    'Line Total': formatNumber(item?.total_price ?? Number(item?.price || 0) * Number(item?.quantity || 0)),
  }));
});

const estimatedRetailValue = (product) => {
  const options = Array.isArray(product?.variants) ? product.variants : [];
  const defaultOption = options.find((option) => option.is_default) || options[0];
  const ratio = Number(defaultOption?.base_unit_quantity || 1);
  const price = Number(defaultOption?.price ?? product?.price ?? 0);
  return ratio > 0 ? Number(product?.stock || 0) / ratio * price : 0;
};

const inventoryRows = (products = []) => products.map((product) => ({
  Product: product?.title || product?.name || '',
  Category: product?.category || 'Uncategorized',
  'Unit Price': formatNumber(product?.price),
  Stock: Number(product?.stock || 0),
  'Stock Unit': product?.base_unit?.code || 'pc',
  'Estimated Retail Value': formatNumber(estimatedRetailValue(product)),
}));

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const exportMerchantReportCsv = ({ orders, storeName }) => {
  const rows = buildMerchantReportRows(orders);
  const csv = [
    REPORT_COLUMNS.map(csvCell).join(','),
    ...rows.map((row) => REPORT_COLUMNS.map((column) => csvCell(row[column])).join(',')),
  ].join('\r\n');
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `${normalizeFilename(storeName)}-report-${dateStamp()}.csv`);
};

export const exportMerchantReportExcel = async ({ orders, products, storeName, summary, filterLabel }) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet([
    [`${storeName || 'Merchant'} Report`],
    ['Filtered period', filterLabel],
    ['Generated', new Date().toLocaleString('en-PH')],
    [],
    ['Metric', 'Value'],
    ['Orders', summary.orders],
    ['Gross Revenue', summary.grossRevenue],
    ['Average Order Value', summary.averageOrderValue],
    ['Products', summary.products],
    ['Inventory Value', summary.inventoryValue],
  ]);
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 28 }];

  const orderSheet = XLSX.utils.json_to_sheet(buildMerchantReportRows(orders), { header: REPORT_COLUMNS });
  orderSheet['!cols'] = REPORT_COLUMNS.map((column) => ({ wch: Math.max(12, Math.min(28, column.length + 5)) }));
  const stockSheet = XLSX.utils.json_to_sheet(inventoryRows(products));
  stockSheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 24 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, orderSheet, 'Order Items');
  XLSX.utils.book_append_sheet(workbook, stockSheet, 'Inventory');
  XLSX.writeFileXLSX(workbook, `${normalizeFilename(storeName)}-report-${dateStamp()}.xlsx`);
};

export const exportMerchantReportPdf = async ({ orders, storeName, summary, filterLabel }) => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const documentPdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  documentPdf.setTextColor(11, 23, 57);
  documentPdf.setFontSize(18);
  documentPdf.text(`${storeName || 'Merchant'} Sales Report`, 40, 42);
  documentPdf.setFontSize(9);
  documentPdf.setTextColor(100, 116, 139);
  documentPdf.text(`Period: ${filterLabel}  |  Generated: ${new Date().toLocaleString('en-PH')}`, 40, 60);

  autoTable(documentPdf, {
    startY: 76,
    theme: 'grid',
    head: [['Orders', 'Gross Revenue', 'Average Order Value', 'Products', 'Inventory Value']],
    body: [[
      String(summary.orders),
      `PHP ${formatNumber(summary.grossRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      `PHP ${formatNumber(summary.averageOrderValue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      String(summary.products),
      `PHP ${formatNumber(summary.inventoryValue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    ]],
    headStyles: { fillColor: [41, 84, 200], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  const rows = buildMerchantReportRows(orders);
  autoTable(documentPdf, {
    startY: documentPdf.lastAutoTable.finalY + 18,
    theme: 'striped',
    head: [['Order', 'Date', 'Customer', 'Status', 'Payment', 'Product', 'Qty', 'Line Total']],
    body: rows.map((row) => [
      row['Order ID'], row['Order Date'], row.Customer, row['Order Status'], row['Payment Method'], row.Product,
      row.Quantity, `PHP ${formatNumber(row['Line Total']).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    ]),
    headStyles: { fillColor: [11, 23, 57], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 247, 253] },
    styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 90 }, 6: { halign: 'right', cellWidth: 30 }, 7: { halign: 'right', cellWidth: 68 } },
    didDrawPage: () => {
      documentPdf.setFontSize(8);
      documentPdf.setTextColor(148, 163, 184);
      documentPdf.text(`Page ${documentPdf.getNumberOfPages()}`, documentPdf.internal.pageSize.getWidth() - 70, documentPdf.internal.pageSize.getHeight() - 18);
    },
  });
  documentPdf.save(`${normalizeFilename(storeName)}-report-${dateStamp()}.pdf`);
};

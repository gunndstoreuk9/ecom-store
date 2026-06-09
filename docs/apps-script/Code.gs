const ORDERS_SHEET_NAME = 'Sheet1';

const ORDER_HEADERS = [
  'DATE',
  'SKU',
  'FULL NAME',
  'PHONE NUMBER',
  'CITY',
  'QUANTITY',
  'TOTAL PRICE MAD',
  'STATUS'
];

function doGet() {
  return jsonResponse({ ok: true, service: 'tawazon-orders-webhook' });
}

function doPost(e) {
  try {
    const body = parseBody(e);
    const result = appendOrder(body.order || body);

    return jsonResponse({
      ok: true,
      result: result
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body');
  }

  return JSON.parse(e.postData.contents);
}

function appendOrder(order) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getOrdersSheet();
    ensureHeaders(sheet);

    const headers = getHeaders(sheet);
    const row = buildOrderRow(headers, order);

    sheet.appendRow(row);
    return { mode: 'inserted', row: sheet.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

function getOrdersSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.getActiveSheet();

    if (!sheet) {
      sheet = spreadsheet.insertSheet(ORDERS_SHEET_NAME);
    }
  }

  return sheet;
}

function ensureHeaders(sheet) {
  sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
  sheet.setFrozenRows(1);
}

function getHeaders(sheet) {
  return sheet
    .getRange(1, 1, 1, ORDER_HEADERS.length)
    .getValues()[0]
    .map(function(value) {
      return String(value || '').trim();
    });
}

function buildOrderRow(headers, order) {
  const rowObject = {
    'DATE': order.DATE || '',
    'SKU': order.SKU || '',
    'FULL NAME': order['FULL NAME'] || '',
    'PHONE NUMBER': order['PHONE NUMBER'] || '',
    'CITY': order.CITY || '',
    'QUANTITY': order.QUANTITY || '',
    'TOTAL PRICE MAD': order['TOTAL PRICE MAD'] || '',
    'STATUS': ''
  };

  return headers.map(function(header) {
    return rowObject[header] == null ? '' : rowObject[header];
  });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

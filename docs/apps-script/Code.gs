const ORDERS_SHEET_NAME = 'Sheet1';

const ORDER_HEADERS = [
  'DATE',
  'ORDERID',
  'CITY',
  'FULL NAME',
  'PHONE NUMBER',
  'PRODUCT',
  'SKU',
  'QUANTITY',
  'TOTAL PRICE MAD',
  'CURRENCY',
  'STATUS'
];

function doGet() {
  return jsonResponse({ ok: true, service: 'tawazon-orders-webhook' });
}

function doPost(e) {
  try {
    const body = parseBody(e);
    const result = upsertOrder(body.order || body);

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

function upsertOrder(order) {
  if (!order.ORDERID) {
    throw new Error('ORDERID is required');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getOrdersSheet();
    ensureHeaders(sheet);

    const headers = getHeaders(sheet);
    const orderIdColumn = headers.indexOf('ORDERID') + 1;
    const rowIndex = findRowByValue(sheet, orderIdColumn, order.ORDERID);
    const row = buildOrderRow(headers, order);

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
      return { mode: 'updated', row: rowIndex };
    }

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

function findRowByValue(sheet, column, value) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2 || column < 1) {
    return -1;
  }

  const values = sheet.getRange(2, column, lastRow - 1, 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) {
      return i + 2;
    }
  }

  return -1;
}

function buildOrderRow(headers, order) {
  const rowObject = {
    'DATE': order.DATE || '',
    'ORDERID': order.ORDERID || '',
    'CITY': order.CITY || 'AGADIR',
    'FULL NAME': order['FULL NAME'] || '',
    'PHONE NUMBER': order['PHONE NUMBER'] || '',
    'PRODUCT': order.PRODUCT || '',
    'SKU': order.SKU || '',
    'QUANTITY': order.QUANTITY || '',
    'TOTAL PRICE MAD': order['TOTAL PRICE MAD'] || '',
    'CURRENCY': order.CURRENCY || 'MAD',
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

const ORDERS_SHEET_NAME = 'Orders';
const PRODUCTS_SHEET_NAME = 'Products';

const ORDER_HEADERS = [
  'order_id',
  'public_order_number',
  'created_at',
  'updated_at',
  'status',
  'customer_name',
  'phone_raw',
  'phone_local',
  'phone_e164',
  'city',
  'address',
  'confirmation_notes',
  'hero_sku',
  'hero_qty',
  'hero_price_mad',
  'drawer_cross_sells',
  'upsell_status',
  'upsell_sku',
  'upsell_price_mad',
  'items_summary',
  'subtotal_mad',
  'total_mad',
  'currency',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'landing_page',
  'referrer',
  'meta_event_id',
  'tiktok_event_id',
  'google_transaction_id',
  'fbp',
  'fbc',
  'ttp',
  'ttclid',
  'carrier',
  'tracking_number',
  'sheet_updated_at'
];

function doGet() {
  return jsonResponse({ ok: true, service: 'tawazon-sheets-webhook' });
}

function doPost(e) {
  try {
    const body = parseBody(e);
    const action = body.action || '';

    if (!isAuthorized(body)) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
    }

    if (action === 'ping') {
      return jsonResponse({ ok: true });
    }

    if (action === 'upsert_order') {
      const result = upsertOrder(body.order || {});
      return jsonResponse({ ok: true, result });
    }

    return jsonResponse({ ok: false, error: 'unsupported_action' }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) }, 500);
  }
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing request body');
  }

  return JSON.parse(e.postData.contents);
}

function isAuthorized(body) {
  const expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!expected) {
    throw new Error('WEBHOOK_SECRET script property is missing');
  }

  return body.secret && String(body.secret) === String(expected);
}

function upsertOrder(order) {
  if (!order.order_id) {
    throw new Error('order.order_id is required');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getOrCreateSheet(ORDERS_SHEET_NAME, ORDER_HEADERS);
    ensureHeaders(sheet, ORDER_HEADERS);

    const headers = getHeaders(sheet);
    const orderIdColumn = headers.indexOf('order_id') + 1;
    const rowIndex = findRowByValue(sheet, orderIdColumn, order.order_id);
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

function getOrCreateSheet(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function ensureHeaders(sheet, requiredHeaders) {
  const currentHeaders = getHeaders(sheet);

  if (currentHeaders.length === 0 || currentHeaders[0] === '') {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.setFrozenRows(1);
    return;
  }

  const missing = requiredHeaders.filter(function(header) {
    return currentHeaders.indexOf(header) === -1;
  });

  if (missing.length > 0) {
    sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
  }
}

function getHeaders(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(value) {
    return String(value || '').trim();
  });
}

function findRowByValue(sheet, column, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
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
  const rowObject = Object.assign({}, order, {
    sheet_updated_at: new Date().toISOString()
  });

  return headers.map(function(header) {
    const value = rowObject[header];

    if (Array.isArray(value) || (value && typeof value === 'object')) {
      return JSON.stringify(value);
    }

    return value == null ? '' : value;
  });
}

function jsonResponse(payload, statusCode) {
  payload.statusCode = statusCode || 200;

  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);

  // Apps Script Web Apps do not support setting arbitrary HTTP status codes
  // in all runtimes, so include statusCode in the JSON for backend handling.
  return output;
}

const CALL_CENTER_IMPORT_URL = 'https://api.tawazonhealth.store/v1/orders/sheet-import';
const CALL_CENTER_IMPORT_TOKEN = 'CHANGE_THIS_TO_SHOPIFY_SHEET_WEBHOOK_TOKEN';
const IMPORT_STATUS_HEADER = 'CALL CENTER IMPORT STATUS';
const IMPORT_ORDER_ID_HEADER = 'CALL CENTER ORDER ID';
const IMPORT_ERROR_HEADER = 'CALL CENTER IMPORT ERROR';

const REQUIRED_HEADERS = [
  'SKU',
  'FULL NAME',
  'PHONE NUMBER'
];

function sendNewLeadsToCallCenter() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const headers = getOrCreateHeaders_(sheet);
    ensureRequiredHeaders_(headers);
    const statusCol = ensureHeader_(sheet, headers, IMPORT_STATUS_HEADER);
    const orderIdCol = ensureHeader_(sheet, headers, IMPORT_ORDER_ID_HEADER);
    const errorCol = ensureHeader_(sheet, headers, IMPORT_ERROR_HEADER);
    const finalHeaders = getHeaders_(sheet);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return;

    const values = sheet.getRange(2, 1, lastRow - 1, finalHeaders.length).getValues();
    values.forEach(function(row, index) {
      const rowNumber = index + 2;
      const status = String(row[statusCol - 1] || '').trim();

      if (status === 'IMPORTED') return;
      if (isEmptyLeadRow_(row)) return;

      try {
        const payload = buildPayload_(finalHeaders, row, rowNumber, sheet);
        const result = postLead_(payload);
        sheet.getRange(rowNumber, statusCol).setValue('IMPORTED');
        sheet.getRange(rowNumber, orderIdCol).setValue(result.public_order_number || result.order_id || '');
        sheet.getRange(rowNumber, errorCol).setValue('');
      } catch (error) {
        sheet.getRange(rowNumber, statusCol).setValue('ERROR');
        sheet.getRange(rowNumber, errorCol).setValue(String(error && error.message ? error.message : error));
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Call Center')
    .addItem('Send new leads now', 'sendNewLeadsToCallCenter')
    .addToUi();
}

function installEveryMinuteTrigger() {
  ScriptApp.newTrigger('sendNewLeadsToCallCenter')
    .timeBased()
    .everyMinutes(1)
    .create();
}

function getOrCreateHeaders_(sheet) {
  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
  }
  return getHeaders_(sheet);
}

function getHeaders_(sheet) {
  return sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getValues()[0]
    .map(function(value) {
      return String(value || '').trim();
    });
}

function ensureRequiredHeaders_(headers) {
  const normalized = headers.map(function(header) {
    return header.toUpperCase();
  });

  REQUIRED_HEADERS.forEach(function(header) {
    if (normalized.indexOf(header) === -1) {
      throw new Error('Missing required header: ' + header);
    }
  });
}

function ensureHeader_(sheet, headers, headerName) {
  const existingIndex = headers.map(function(header) {
    return header.toUpperCase();
  }).indexOf(headerName.toUpperCase());

  if (existingIndex !== -1) return existingIndex + 1;

  const nextColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextColumn).setValue(headerName);
  headers.push(headerName);
  return nextColumn;
}

function buildPayload_(headers, row, rowNumber, sheet) {
  const rowObject = {};
  headers.forEach(function(header, index) {
    if (!header) return;
    rowObject[header] = row[index];
  });

  rowObject.ROW_NUMBER = rowNumber;
  rowObject.SOURCE = 'shopify_sheet';
  rowObject.SOURCE_ID = SpreadsheetApp.getActiveSpreadsheet().getId() + ':' + sheet.getSheetId() + ':' + rowNumber;
  return { row: rowObject };
}

function postLead_(payload) {
  const response = UrlFetchApp.fetch(CALL_CENTER_IMPORT_URL + '?token=' + encodeURIComponent(CALL_CENTER_IMPORT_TOKEN), {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify(payload)
  });

  const text = response.getContentText();
  const code = response.getResponseCode();
  const json = text ? JSON.parse(text) : {};

  if (code < 200 || code >= 300) {
    throw new Error(json.detail || text || 'Import failed with status ' + code);
  }

  return json;
}

function isEmptyLeadRow_(row) {
  return row.every(function(value) {
    return String(value || '').trim() === '';
  });
}

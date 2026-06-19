const CALL_CENTER_IMPORT_URL = 'https://api.tawazonhealth.store/v1/orders/sheet-import';
const CALL_CENTER_IMPORT_TOKEN = 'CHANGE_THIS_TO_SHOPIFY_SHEET_WEBHOOK_TOKEN';
// Optional but recommended: paste the Google Sheet ID and tab name to avoid importing the wrong sheet.
const SHOPIFY_SPREADSHEET_ID = '';
const SHOPIFY_SHEET_NAME = '';
const IMPORT_STATUS_HEADER = 'CALL CENTER IMPORT STATUS';
const IMPORT_ORDER_ID_HEADER = 'CALL CENTER ORDER ID';
const IMPORT_ERROR_HEADER = 'CALL CENTER IMPORT ERROR';

const HEADER_ALIASES = {
  SKU: ['SKU', 'PRODUCT SKU', 'PRODUCT_SKU', 'LINEITEM SKU', 'LINEITEM_SKU', 'LINEITEM SKU', 'VARIANT SKU'],
  'FULL NAME': ['FULL NAME', 'FULL_NAME', 'NAME', 'CUSTOMER', 'CUSTOMER NAME', 'CUSTOMER_NAME', 'SHIPPING NAME'],
  'PHONE NUMBER': ['PHONE NUMBER', 'PHONE_NUMBER', 'PHONE', 'TEL', 'MOBILE', 'SHIPPING PHONE'],
  CITY: ['CITY', 'VILLE', 'TOWN', 'SHIPPING CITY'],
  ADDRESS: ['ADDRESS', 'ADRESSE', 'SHIPPING ADDRESS', 'SHIPPING_ADDRESS', 'ADDRESS1', 'SHIPPING ADDRESS1'],
  QUANTITY: ['QUANTITY', 'QTY', 'QTE', 'LINEITEM QUANTITY'],
  'TOTAL PRICE MAD': ['TOTAL PRICE MAD', 'TOTAL_PRICE_MAD', 'TOTAL', 'PRICE', 'TOTAL PRICE', 'AMOUNT']
};

const REQUIRED_HEADERS = ['SKU', 'FULL NAME', 'PHONE NUMBER'];

const PRODUCT_NAME_RULES = [
  { sku: 'MIRACLE-MEN-OIL-30ML', words: ['MIRACLE', 'MEN OIL', 'MEN-OIL', 'XXL', 'PROSPER MAN'] },
  { sku: 'TOPLUX-BSC-940-60', words: ['BLOOD SUGAR', 'SUGAR', 'COMPLIX', 'COMPLEX', 'سكر'] }
];

function sendNewLeadsToCallCenter() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return;

  try {
    const sheet = getTargetSheet_();
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
        if (!looksLikeKnownSku_(payload.row.SKU)) {
          sheet.getRange(rowNumber, statusCol).setValue('SKIPPED_NO_SKU');
          sheet.getRange(rowNumber, errorCol).setValue('Skipped: no supported SKU in this row');
          return;
        }
        if (!isMoroccoPhone_(payload.row['PHONE NUMBER'])) {
          sheet.getRange(rowNumber, statusCol).setValue('SKIPPED_NON_MA');
          sheet.getRange(rowNumber, errorCol).setValue('Skipped: phone is not a Moroccan number');
          return;
        }
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

function getTargetSheet_() {
  const spreadsheet = SHOPIFY_SPREADSHEET_ID
    ? SpreadsheetApp.openById(SHOPIFY_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('No active spreadsheet. Open this script from the Shopify leads Google Sheet, or set SHOPIFY_SPREADSHEET_ID.');
  }

  if (SHOPIFY_SHEET_NAME) {
    const sheet = spreadsheet.getSheetByName(SHOPIFY_SHEET_NAME);
    if (!sheet) throw new Error('Sheet tab not found: ' + SHOPIFY_SHEET_NAME);
    return sheet;
  }

  return spreadsheet.getActiveSheet();
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
    return normalizeHeader_(header);
  });

  REQUIRED_HEADERS.forEach(function(header) {
    if (findHeaderIndex_(normalized, header) === -1) {
      throw new Error('Missing required header: ' + header + ' (accepted: ' + HEADER_ALIASES[header].join(', ') + ')');
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

  addCanonicalField_(rowObject, headers, row, 'SKU');
  addCanonicalField_(rowObject, headers, row, 'FULL NAME');
  addCanonicalField_(rowObject, headers, row, 'PHONE NUMBER');
  addCanonicalField_(rowObject, headers, row, 'CITY');
  addCanonicalField_(rowObject, headers, row, 'ADDRESS');
  addCanonicalField_(rowObject, headers, row, 'QUANTITY');
  addCanonicalField_(rowObject, headers, row, 'TOTAL PRICE MAD');
  applyKnownSheetLayoutFixes_(rowObject, row);

  rowObject.ROW_NUMBER = rowNumber;
  rowObject.SOURCE = 'shopify_sheet';
  rowObject.SOURCE_ID = sheet.getParent().getId() + ':' + sheet.getSheetId() + ':' + rowNumber;
  return { row: rowObject };
}

function applyKnownSheetLayoutFixes_(rowObject, row) {
  const colA = String(row[0] || '').trim();
  const colB = String(row[1] || '').trim();
  const colC = String(row[2] || '').trim();
  const colE = String(row[4] || '').trim();
  const colF = String(row[5] || '').trim();
  const colG = String(row[6] || '').trim();

  // RADC Shopify export has wrong headers: A=name, B=phone, C=city, E=qty, F=price, G=product.
  if (looksLikePhone_(colB) && !looksLikeKnownSku_(colA)) {
    rowObject['FULL NAME'] = colA;
    rowObject['PHONE NUMBER'] = colB;
    rowObject.CITY = colC;
    rowObject.QUANTITY = colE || rowObject.QUANTITY || '1';
    rowObject['TOTAL PRICE MAD'] = colF || rowObject['TOTAL PRICE MAD'] || '';
    rowObject['PRODUCT NAME'] = colG;

    const inferredSku = inferSkuFromProduct_(colG);
    if (inferredSku) rowObject.SKU = inferredSku;
  }

  // Do not infer missing SKUs from product names. Only rows with explicit supported SKUs are imported.
}

function inferSkuFromProduct_(productName) {
  const text = String(productName || '').trim().toUpperCase();
  if (!text) return '';

  for (var i = 0; i < PRODUCT_NAME_RULES.length; i++) {
    const rule = PRODUCT_NAME_RULES[i];
    for (var j = 0; j < rule.words.length; j++) {
      if (text.indexOf(rule.words[j].toUpperCase()) !== -1) return rule.sku;
    }
  }

  return '';
}

function looksLikeKnownSku_(value) {
  const text = String(value || '').trim().toUpperCase();
  return text === 'MIRACLE-MEN-OIL-30ML' || text === 'TOPLUX-BSC-940-60';
}

function looksLikePhone_(value) {
  return /\+?\d[\d\s().-]{7,}/.test(String(value || ''));
}

function isMoroccoPhone_(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return /^0[67]\d{8}$/.test(digits) || /^2120?[67]\d{8}$/.test(digits) || /^002120?[67]\d{8}$/.test(digits);
}

function addCanonicalField_(rowObject, headers, row, canonicalHeader) {
  if (String(rowObject[canonicalHeader] || '').trim()) return;

  const normalized = headers.map(function(header) {
    return normalizeHeader_(header);
  });
  const index = findHeaderIndex_(normalized, canonicalHeader);
  if (index !== -1) rowObject[canonicalHeader] = row[index];
}

function findHeaderIndex_(normalizedHeaders, canonicalHeader) {
  const aliases = HEADER_ALIASES[canonicalHeader] || [canonicalHeader];
  for (var i = 0; i < aliases.length; i++) {
    const alias = normalizeHeader_(aliases[i]);
    const index = normalizedHeaders.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

function normalizeHeader_(header) {
  return String(header || '')
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
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
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (error) {
    json = {};
  }

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

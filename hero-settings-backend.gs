/**
 * ============================================================
 * Hero settings backend (إعدادات قسم الرئيسية)
 * ============================================================
 * أضف هذه الدوال إلى مشروع Apps Script الخاص بك، ثم أضف سطرين
 * في دالة التوزيع (doPost) التي تعالج الأكشنات:
 *
 *   if (action === 'getSettings')    return handleGetSettings_();
 *   if (action === 'updateSettings') return handleUpdateSettings_(payload, user);
 *
 * قم بإنشاء ورقة باسم  Settings  (عمودان: key | value)
 * إن لم تكن موجودة، سيتم إنشاؤها تلقائياً عند أول حفظ.
 * ملاحظة: دوال التوزيع الموجودة لديك تمرر `payload` و `user`
 * كمتغيرات — تأكد من أن أسماء المعاملات في استدعائك تطابقها.
 */

function handleGetSettings_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Settings');
  var settings = {};
  if (sheet) {
    var rows = sheet.getDataRange().getValues();
    for (var i = 0; i < rows.length; i++) {
      var key = String(rows[i][0] || '').trim();
      if (!key || key.toLowerCase() === 'key') continue;
      settings[key] = rows[i][1];
    }
  }
  return { success: true, settings: settings };
}

function handleUpdateSettings_(payload, user) {
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'صلاحية المشرف مطلوبة.' };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.appendRow(['key', 'value']);
  }
  var settings = payload && payload.settings ? payload.settings : {};
  var existing = {};
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var key = String(rows[i][0] || '').trim();
    if (key) existing[key] = i + 1;
  }
  Object.keys(settings).forEach(function (key) {
    var value = settings[key];
    var str = (value === null || typeof value === 'undefined') ? '' : String(value);
    var rowIndex = existing[key];
    if (rowIndex) {
      sheet.getRange(rowIndex, 2).setValue(str);
    } else {
      sheet.appendRow([key, str]);
    }
  });
  return { success: true, message: 'تم حفظ إعدادات الرئيسية.' };
}

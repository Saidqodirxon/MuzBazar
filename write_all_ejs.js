// Write all EJS files correctly
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

const viewsDir = path.join(__dirname, "src", "views", "admin");

// Helper: number formatting function
const fmtFunc = [
  "function fmt(n) {",
  "    var s = String(n || 0);",
  "    var parts = [];",
  "    var len = s.length;",
  "    for (var i = len; i > 0; i -= 3) {",
  "        var start = Math.max(0, i - 3);",
  "        parts.unshift(s.substring(start, i));",
  "    }",
  "    return parts.join(' ');",
  "}",
].join("\n");

// ===================== USERS.EJS =====================
function buildUsersEjs() {
  var lines = [];
  lines.push("<%");
  lines.push("var layout = '../layouts/layout.ejs';");
  lines.push(fmtFunc);
  lines.push("");
  lines.push("var usersHtml = '';");
  lines.push("if (users.length === 0) {");
  lines.push(
    '    usersHtml = \'<div class="text-center py-5"><i class="fas fa-users fa-5x text-muted mb-3"></i><h3 class="text-muted">Hali foydalanuvchilar yo\\\'q</h3></div>\';'
  );
  lines.push("} else {");
  lines.push(
    '    usersHtml = \'<div class="card"><div class="card-body"><div class="table-responsive">\' +'
  );
  lines.push(
    '        \'<table class="table table-hover"><thead class="table-light"><tr>\' +'
  );
  lines.push("        '<th>Ism</th><th>Telefon</th><th>Buyurtmalar</th>' +");
  lines.push("        '<th>Summa</th><th>Tulangan</th><th>Qoldiq</th>' +");
  lines.push("        '<th>Status</th><th>Sana</th><th>Amallar</th>' +");
  lines.push("        '</tr></thead><tbody>';");
  lines.push("");
  lines.push("    for (var i = 0; i < users.length; i++) {");
  lines.push("        var u = users[i];");
  lines.push("        var statusBadge = u.isActive ? 'success' : 'danger';");
  lines.push("        var statusText = u.isActive ? 'Aktiv' : 'Bloklangan';");
  lines.push("        var toggleIcon = u.isActive ? 'ban' : 'check';");
  lines.push(
    "        var toggleTitle = u.isActive ? 'Bloklash' : 'Aktivlashtirish';"
  );
  lines.push("        var notifyDisabled = u.telegramId ? '' : 'disabled';");
  lines.push("        var blockToggleIcon = u.isBlocked ? 'unlock' : 'lock';");
  lines.push(
    "        var blockToggleClass = u.isBlocked ? 'success' : 'warning';"
  );
  lines.push("");
  lines.push(
    "        var nameCell = '<strong>' + (u.firstName || '') + ' ' + (u.lastName || '') + '</strong>';"
  );
  lines.push(
    "        if (u.username) nameCell += '<br><small class=\"text-muted\">@' + u.username + '</small>';"
  );
  lines.push("");
  lines.push(
    "        var phoneCell = u.phone ? '<a href=\"tel:' + u.phone + '\">' + u.phone + '</a>' : '<span class=\"text-muted\">-</span>';"
  );
  lines.push("");
  lines.push(
    "        var statusCell = '<span class=\"badge bg-' + statusBadge + '\">' + statusText + '</span>';"
  );
  lines.push(
    "        if (u.isBlocked) statusCell += '<br><span class=\"badge bg-danger mt-1\">Blok</span>';"
  );
  lines.push("");
  lines.push(
    "        var debtClass = (u.totalDebt || 0) > 0 ? 'text-danger fw-bold' : 'text-success';"
  );
  lines.push("");
  lines.push(
    '        var actionsCell = \'<div class="btn-group" role="group">\' +'
  );
  lines.push(
    '            \'<a href="/admin/users/\' + u._id + \'" class="btn btn-sm btn-outline-primary" title="Korish"><i class="fas fa-eye"></i></a>\';'
  );
  lines.push("");
  lines.push("        if (u.isBlocked) {");
  lines.push(
    '            actionsCell += \'<form method="POST" action="/admin/users/\' + u._id + \'/toggle-block" style="display:inline">\' +'
  );
  lines.push(
    "                '<button type=\"submit\" class=\"btn btn-sm btn-outline-' + blockToggleClass + '\"><i class=\"fas fa-' + blockToggleIcon + '\"></i></button></form>';"
  );
  lines.push("        }");
  lines.push("");
  lines.push(
    '        actionsCell += \'<form method="POST" action="/admin/users/\' + u._id + \'/toggle-status" style="display:inline">\' +'
  );
  lines.push(
    "            '<button type=\"submit\" class=\"btn btn-sm btn-outline-' + (u.isActive ? 'warning' : 'success') + '\"><i class=\"fas fa-' + toggleIcon + '\"></i></button></form>';"
  );
  lines.push("");
  lines.push(
    '        actionsCell += \'<button type="button" class="btn btn-sm btn-outline-info" \' +'
  );
  lines.push(
    '            notifyDisabled + \' data-bs-toggle="modal" data-bs-target="#notifyModal\' + u._id + \'"><i class="fas fa-bell"></i></button>\';'
  );
  lines.push("");
  lines.push("        if (u.role !== 'admin') {");
  lines.push(
    '            actionsCell += \'<form method="POST" action="/admin/users/\' + u._id + \'/delete" style="display:inline" onsubmit="return confirm(this.dataset.msg)" data-msg="Ochirishni tasdiqlaysizmi?">\' +'
  );
  lines.push(
    '                \'<button type="submit" class="btn btn-sm btn-outline-danger"><i class="fas fa-trash"></i></button></form>\';'
  );
  lines.push("        }");
  lines.push("");
  lines.push("        actionsCell += '</div>';");
  lines.push("");
  lines.push("        usersHtml += '<tr>' +");
  lines.push("            '<td>' + nameCell + '</td>' +");
  lines.push("            '<td>' + phoneCell + '</td>' +");
  lines.push("            '<td>' + (u.orderCount || 0) + '</td>' +");
  lines.push("            '<td>' + fmt(u.totalSpent) + '</td>' +");
  lines.push("            '<td>' + fmt(u.totalPaid) + '</td>' +");
  lines.push(
    "            '<td><span class=\"' + debtClass + '\">' + fmt(u.totalDebt) + '</span></td>' +"
  );
  lines.push("            '<td>' + statusCell + '</td>' +");
  lines.push(
    "            '<td>' + moment(u.createdAt).utcOffset(5).format('DD/MM/YYYY') + '</td>' +"
  );
  lines.push("            '<td>' + actionsCell + '</td></tr>';");
  lines.push("    }");
  lines.push("");
  lines.push("    usersHtml += '</tbody></table></div></div></div>';");
  lines.push("");
  lines.push("    // Notification modals");
  lines.push("    for (var j = 0; j < users.length; j++) {");
  lines.push("        var mu = users[j];");
  lines.push(
    '        usersHtml += \'<div class="modal fade" id="notifyModal\' + mu._id + \'" tabindex="-1">\' +'
  );
  lines.push(
    '            \'<div class="modal-dialog"><div class="modal-content">\' +'
  );
  lines.push(
    "            '<div class=\"modal-header\"><h5 class=\"modal-title\">Xabar yuborish: ' + (mu.firstName || '') + '</h5>' +"
  );
  lines.push(
    '            \'<button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>\' +'
  );
  lines.push(
    "            '<form method=\"POST\" action=\"/admin/users/' + mu._id + '/notify\">' +"
  );
  lines.push('            \'<div class="modal-body"><div class="mb-3">\' +');
  lines.push(
    "            '<label class=\"form-label\">Xabar matni:</label>' +"
  );
  lines.push(
    "            '<textarea class=\"form-control\" name=\"message\" rows=\"4\" required>Hurmatli ' + (mu.firstName || '') + '!</textarea>' +"
  );
  lines.push("            '</div></div>' +");
  lines.push("            '<div class=\"modal-footer\">' +");
  lines.push(
    '            \'<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Bekor qilish</button>\' +'
  );
  lines.push(
    '            \'<button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane me-1"></i>Yuborish</button>\' +'
  );
  lines.push("            '</div></form></div></div></div>';");
  lines.push("    }");
  lines.push("}");
  lines.push("");
  lines.push("var searchVal = typeof search !== 'undefined' ? search : '';");
  lines.push(
    "var body = '<div class=\"d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom\">' +"
  );
  lines.push(
    '    \'<h1 class="h2"><i class="fas fa-users me-2"></i>Foydalanuvchilar</h1></div>\' +'
  );
  lines.push('    \'<div class="row mb-3"><div class="col-md-6">\' +');
  lines.push(
    '    \'<form action="/admin/users" method="GET" class="d-flex">\' +'
  );
  lines.push(
    '    \'<input type="text" name="search" class="form-control me-2" placeholder="Qidiruv..." value="\' + searchVal + \'">\' +'
  );
  lines.push(
    '    \'<button class="btn btn-outline-secondary" type="submit">Qidirish</button>\' +'
  );
  lines.push(
    '    (searchVal ? \'<a href="/admin/users" class="btn btn-outline-danger ms-2"><i class="fas fa-times"></i></a>\' : \'\') +'
  );
  lines.push("    '</form></div></div>' + usersHtml;");
  lines.push("-%>");
  lines.push("<%- include(layout, { body: body, title: title }) %>");
  return lines.join("\n");
}

// ===================== USER-DETAILS.EJS =====================
function buildUserDetailsEjs() {
  var lines = [];
  lines.push("<%");
  lines.push("var layout = '../layouts/layout.ejs';");
  lines.push(fmtFunc);
  lines.push("");
  lines.push(
    "var userName = (user.firstName || '') + ' ' + (user.lastName || '');"
  );
  lines.push("var userUsername = user.username ? '@' + user.username : '-';");
  lines.push("var userPhone = user.phone || 'Kiritilmagan';");
  lines.push(
    "var userCreatedAt = moment(user.createdAt).utcOffset(5).format('DD/MM/YYYY HH:mm');"
  );
  lines.push("var hasDebt = (stats.totalDebt || 0) > 0;");
  lines.push("var hasOrders = user.orders && user.orders.length > 0;");
  lines.push("var hasPayments = payments && payments.length > 0;");
  lines.push(
    "var hasProducts = productsStats && productsStats.products && productsStats.products.length > 0;"
  );
  lines.push(
    "var profitValue = hasProducts ? (productsStats.totalSellValue - productsStats.totalCostValue) : 0;"
  );
  lines.push("");
  lines.push("var ordersRowsHTML = '';");
  lines.push("if (hasOrders) {");
  lines.push("    for (var i = 0; i < user.orders.length; i++) {");
  lines.push("        var order = user.orders[i];");
  lines.push("        var sc = 'secondary'; var st = order.status || '';");
  lines.push(
    "        if (order.status === 'pending') { sc = 'warning'; st = 'Kutilmoqda'; }"
  );
  lines.push(
    "        else if (order.status === 'confirmed') { sc = 'info'; st = 'Tasdiqlangan'; }"
  );
  lines.push(
    "        else if (order.status === 'delivered') { sc = 'success'; st = 'Yetkazilgan'; }"
  );
  lines.push(
    "        else if (order.status === 'cancelled') { sc = 'danger'; st = 'Bekor qilingan'; }"
  );
  lines.push(
    "        var dc = order.debt > 0 ? 'text-danger fw-bold' : 'text-success';"
  );
  lines.push(
    "        ordersRowsHTML += '<tr><td class=\"ps-3\"><a href=\"/admin/orders/' + order._id + '\">#' + order.orderNumber + '</a></td>' +"
  );
  lines.push(
    "            '<td>' + fmt(order.totalSum) + '</td><td>' + fmt(order.paidSum) + '</td>' +"
  );
  lines.push(
    "            '<td class=\"' + dc + '\">' + fmt(order.debt) + '</td>' +"
  );
  lines.push(
    "            '<td><span class=\"badge bg-' + sc + '\">' + st + '</span></td>' +"
  );
  lines.push(
    "            '<td>' + moment(order.createdAt).utcOffset(5).format('DD/MM/YYYY') + '</td></tr>';"
  );
  lines.push("    }");
  lines.push("} else {");
  lines.push(
    '    ordersRowsHTML = \'<tr><td colspan="6" class="text-center py-4 text-muted">Buyurtmalar yoq</td></tr>\';'
  );
  lines.push("}");
  lines.push("");
  lines.push("var paymentsRowsHTML = '';");
  lines.push("if (hasPayments) {");
  lines.push("    for (var pi = 0; pi < payments.length; pi++) {");
  lines.push("        var pay = payments[pi];");
  lines.push(
    "        var sellerName = pay.seller ? ((pay.seller.firstName || '') + ' ' + (pay.seller.lastName || '')) : (pay.adminName || 'System');"
  );
  lines.push(
    "        paymentsRowsHTML += '<tr><td class=\"ps-3\">' + moment(pay.createdAt).utcOffset(5).format('DD/MM/YYYY HH:mm') + '</td>' +"
  );
  lines.push(
    "            '<td class=\"text-success fw-bold\">' + fmt(pay.amount) + '</td><td>' + sellerName + '</td>' +"
  );
  lines.push("            '<td>' + (pay.notes || '-') + '</td>' +");
  lines.push(
    '            \'<td class="text-end pe-3"><form action="/admin/users/\' + user._id + \'/payments/\' + pay._id + \'/delete" method="POST" style="display:inline">\' +'
  );
  lines.push(
    '            \'<button type="submit" class="btn btn-sm btn-outline-danger border-0" onclick="return confirm(this.dataset.msg)" data-msg="Ochirasizmi?"><i class="fas fa-trash"></i></button></form></td></tr>\';'
  );
  lines.push("    }");
  lines.push("} else {");
  lines.push(
    '    paymentsRowsHTML = \'<tr><td colspan="5" class="text-center py-4 text-muted">Tolovlar tarixi bosh</td></tr>\';'
  );
  lines.push("}");
  lines.push("");
  lines.push("var productsRowsHTML = '';");
  lines.push("if (hasProducts) {");
  lines.push(
    "    for (var pp = 0; pp < productsStats.products.length; pp++) {"
  );
  lines.push("        var p = productsStats.products[pp];");
  lines.push(
    "        var skc = p.stock <= 5 ? 'text-danger' : p.stock <= 10 ? 'text-warning' : 'text-success';"
  );
  lines.push("        productsRowsHTML += '<tr><td>' + p.name + '</td>' +");
  lines.push(
    "            '<td><span class=\"badge bg-secondary opacity-75\">' + p.category + '</span></td>' +"
  );
  lines.push(
    "            '<td class=\"' + skc + ' fw-bold\">' + p.stock + '</td>' +"
  );
  lines.push(
    "            '<td>' + fmt(p.costPrice) + '</td><td>' + fmt(p.sellPrice) + '</td>' +"
  );
  lines.push(
    "            '<td class=\"text-info fw-bold\">' + fmt(p.profit) + '</td></tr>';"
  );
  lines.push("    }");
  lines.push("}");
  lines.push("");
  lines.push("var orderOptionsHTML = '';");
  lines.push("if (hasOrders) {");
  lines.push("    for (var oi = 0; oi < user.orders.length; oi++) {");
  lines.push("        var o = user.orders[oi];");
  lines.push("        if (o.debt > 0) {");
  lines.push(
    "            orderOptionsHTML += '<option value=\"' + o._id + '\">#' + o.orderNumber + ' - Qarz: ' + fmt(o.debt) + '</option>';"
  );
  lines.push("        }");
  lines.push("    }");
  lines.push("}");
  lines.push("");
  lines.push("// Build the page body");
  lines.push(
    "var body = '<div class=\"d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom\">' +"
  );
  lines.push(
    "    '<h1 class=\"h2\"><i class=\"fas fa-user me-2\"></i>' + userName + '</h1>' +"
  );
  lines.push("    '<div class=\"btn-toolbar mb-2 mb-md-0 d-flex gap-1\">' +");
  lines.push(
    "    (hasProducts ? '<a href=\"/admin/users/' + user._id + '/export-products\" class=\"btn btn-sm btn-outline-success shadow-sm\"><i class=\"fas fa-file-excel me-1\"></i>Mahsulotlar</a>' : '') +"
  );
  lines.push(
    "    (hasOrders ? '<a href=\"/admin/users/' + user._id + '/export-orders\" class=\"btn btn-sm btn-outline-primary shadow-sm\"><i class=\"fas fa-file-excel me-1\"></i>Buyurtmalar</a>' : '') +"
  );
  lines.push(
    "    (hasDebt ? '<a href=\"/admin/users/' + user._id + '/export\" class=\"btn btn-sm btn-success shadow-sm\"><i class=\"fas fa-file-excel me-1\"></i>Qarzdorlik Excel</a>' : '') +"
  );
  lines.push(
    '    \'<a href="/admin/users" class="btn btn-sm btn-outline-secondary shadow-sm ms-2"><i class="fas fa-arrow-left me-2"></i>Orqaga</a></div></div>\' +'
  );
  lines.push("");
  lines.push('    \'<div class="row"><div class="col-lg-4">\' +');
  lines.push("");
  lines.push("    '<div class=\"card mb-3 shadow-sm border-0\">' +");
  lines.push(
    '    \'<div class="card-header bg-white border-bottom-0 pb-0"><h5 class="mb-0 fw-bold">Foydalanuvchi</h5></div>\' +'
  );
  lines.push("    '<div class=\"card-body\">' +");
  lines.push(
    "    '<div class=\"mb-2\"><strong>Ism:</strong> ' + userName + '</div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Username:</strong> <span class=\"text-primary\">' + userUsername + '</span></div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Telegram ID:</strong> <code>' + (user.telegramId || '-') + '</code></div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Telefon:</strong> ' + userPhone + '</div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Qayd:</strong> ' + userCreatedAt + '</div><hr>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Buyurtmalar:</strong> ' + (user.orderCount || 0) + ' ta</div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Umumiy summa:</strong> ' + fmt(user.totalSpent) + '</div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Tulandi:</strong> <span class=\"text-success\">' + fmt(stats.totalPaid) + '</span></div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Qarzdorlik:</strong> <span class=\"' + (hasDebt ? 'text-danger fw-bold' : 'text-success') + '\">' + fmt(stats.totalDebt) + '</span></div><hr>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Status:</strong> <span class=\"badge bg-' + (user.isActive ? 'success' : 'danger') + '\">' + (user.isActive ? 'Aktiv' : 'Nofaol') + '</span></div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Sotib olish:</strong> <span class=\"badge bg-' + (!user.isBlocked ? 'success' : 'warning') + '\">' + (!user.isBlocked ? 'Ruxsat berilgan' : 'Bloklangan') + '</span></div>' +"
  );
  lines.push(
    "    '<div class=\"mb-2\"><strong>Rol:</strong> <span class=\"badge bg-' + (user.role === 'admin' ? 'danger' : user.role === 'seller' ? 'warning' : 'info') + '\">' + (user.role === 'admin' ? 'Admin' : user.role === 'seller' ? 'Sotuvchi' : 'Klient') + '</span></div>' +"
  );
  lines.push("    '</div></div>' +");
  lines.push("");
  lines.push("    '<div class=\"card mb-3 shadow-sm border-0\">' +");
  lines.push(
    '    \'<div class="card-header bg-white border-bottom-0 pb-0"><h5 class="mb-0 fw-bold text-center">Boshqaruv</h5></div>\' +'
  );
  lines.push("    '<div class=\"card-body\">' +");
  lines.push(
    '    \'<form method="POST" action="/admin/users/\' + user._id + \'/toggle-block" class="mb-2">\' +'
  );
  lines.push(
    "    '<button type=\"submit\" class=\"btn btn-' + (user.isBlocked ? 'success' : 'outline-warning') + ' btn-sm w-100 py-2\">' +"
  );
  lines.push(
    "    '<i class=\"fas fa-' + (user.isBlocked ? 'check-circle' : 'lock') + ' me-2\"></i>' +"
  );
  lines.push(
    "    (user.isBlocked ? 'Sotib olishga ruxsat berish' : 'Sotib olishni cheklash') + '</button></form>' +"
  );
  lines.push(
    '    \'<form method="POST" action="/admin/users/\' + user._id + \'/toggle-status" class="mb-2">\' +'
  );
  lines.push(
    "    '<button type=\"submit\" class=\"btn btn-' + (user.isActive ? 'outline-danger' : 'success') + ' btn-sm w-100 py-2\">' +"
  );
  lines.push(
    "    '<i class=\"fas fa-' + (user.isActive ? 'user-slash' : 'user-check') + ' me-2\"></i>' +"
  );
  lines.push(
    "    (user.isActive ? 'Profilni nofaol qilish' : 'Profilni faollashtirish') + '</button></form>' +"
  );
  lines.push(
    "    '<button type=\"button\" class=\"btn btn-primary btn-sm w-100 py-2 shadow-sm mb-2\" data-bs-toggle=\"modal\" data-bs-target=\"#paymentModal\" ' + ((!hasDebt && !hasOrders) ? 'disabled' : '') + '>' +"
  );
  lines.push(
    "    '<i class=\"fas fa-plus-circle me-2\"></i>Tolov qoshish</button>' +"
  );
  lines.push(
    '    (user.role !== \'admin\' ? \'<form method="POST" action="/admin/users/\' + user._id + \'/delete" onsubmit="return confirm(this.dataset.msg)" data-msg="Bu foydalanuvchini butunlay ochirasizmi?">\' +'
  );
  lines.push(
    '    \'<button type="submit" class="btn btn-danger btn-sm w-100 py-2"><i class="fas fa-trash-alt me-2"></i>Foydalanuvchini ochirish</button></form>\' : \'\') +'
  );
  lines.push("    '</div></div>' +");
  lines.push("");
  lines.push("    '<div class=\"card mb-3 shadow-sm border-0\">' +");
  lines.push(
    '    \'<div class="card-header bg-white border-bottom-0 pb-0"><h5 class="mb-0 fw-bold">Eslatmalar</h5></div>\' +'
  );
  lines.push("    '<div class=\"card-body\">' +");
  lines.push(
    "    '<form method=\"POST\" action=\"/admin/users/' + user._id + '/notes\">' +"
  );
  lines.push(
    '    \'<div class="mb-2"><textarea class="form-control" name="notes" rows="3" placeholder="Izoh...">\' + (user.notes || \'\') + \'</textarea></div>\' +'
  );
  lines.push(
    '    \'<button type="submit" class="btn btn-outline-primary btn-sm w-100 shadow-sm">Saqlash</button>\' +'
  );
  lines.push("    '</form></div></div></div>' +");
  lines.push("");
  lines.push("    '<div class=\"col-lg-8\">' +");
  lines.push("");
  lines.push("    '<div class=\"card mb-4 shadow-sm border-0\">' +");
  lines.push(
    '    \'<div class="card-header bg-white border-bottom-0"><h5 class="mb-0 fw-bold text-success"><i class="fas fa-history me-2"></i>Tolovlar tarixi</h5></div>\' +'
  );
  lines.push(
    '    \'<div class="card-body p-0"><div class="table-responsive">\' +'
  );
  lines.push(
    '    \'<table class="table table-hover align-middle mb-0"><thead class="table-light"><tr>\' +'
  );
  lines.push(
    '    \'<th class="ps-3">Sana</th><th>Summa</th><th>Masul</th><th>Izoh</th><th class="text-end pe-3">Amallar</th>\' +'
  );
  lines.push(
    "    '</tr></thead><tbody>' + paymentsRowsHTML + '</tbody></table></div></div></div>' +"
  );
  lines.push("");
  lines.push(
    '    \'<div class="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center\"><h5 class="mb-0 fw-bold text-primary"><i class="fas fa-shopping-bag me-2"></i>Buyurtmalar tarixi</h5>\' +'
  );
  lines.push(
    "    (hasOrders ? '<a href=\"/admin/users/' + user._id + '/export-orders\" class=\"text-primary text-decoration-none small\"><i class=\"fas fa-file-excel me-1\"></i>Excel</a>' : '') + '</div>' +"
  );
  lines.push(
    '    \'<div class="card-body p-0"><div class="table-responsive">\' +'
  );
  lines.push(
    '    \'<table class="table table-hover align-middle mb-0"><thead class="table-light"><tr>\' +'
  );
  lines.push(
    "    '<th class=\"ps-3\">No</th><th>Summa</th><th>Tulangan</th><th>Qarz</th><th>Holat</th><th>Sana</th>' +"
  );
  lines.push(
    "    '</tr></thead><tbody>' + ordersRowsHTML + '</tbody></table></div></div></div>';"
  );
  lines.push("");
  lines.push("if (hasProducts) {");
  lines.push("    body += '<div class=\"card mb-4 shadow-sm border-0\">' +");
  lines.push(
    "        '<div class=\"card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center\">' +"
  );
  lines.push(
    '        \'<h5 class="mb-0 fw-bold text-info"><i class="fas fa-boxes me-2"></i>Mahsulotlar hisoboti</h5>\' +'
  );
  lines.push(
    '        \'<a href="/admin/users/\' + user._id + \'/export-products" class="text-info text-decoration-none small mx-3"><i class="fas fa-file-excel me-1"></i>Excel</a>\' +'
  );
  lines.push(
    "        '<span class=\"badge bg-light text-info border\">' + productsStats.totalProducts + ' mahsulot</span></div>' +"
  );
  lines.push("        '<div class=\"card-body\">' +");
  lines.push("        '<div class=\"row g-2 mb-3\">' +");
  lines.push(
    '        \'<div class="col-md-3"><div class="p-3 bg-light rounded text-center"><div class="small text-muted">Jami dona</div><div class="h5 mb-0 fw-bold">\' + fmt(productsStats.totalStock) + \'</div></div></div>\' +'
  );
  lines.push(
    '        \'<div class="col-md-3"><div class="p-3 bg-light rounded text-center"><div class="small text-muted">Tannarxi</div><div class="h5 mb-0 fw-bold text-danger">\' + fmt(productsStats.totalCostValue) + \'</div></div></div>\' +'
  );
  lines.push(
    '        \'<div class="col-md-3"><div class="p-3 bg-light rounded text-center"><div class="small text-muted">Sotish</div><div class="h5 mb-0 fw-bold text-success">\' + fmt(productsStats.totalSellValue) + \'</div></div></div>\' +'
  );
  lines.push(
    '        \'<div class="col-md-3"><div class="p-3 bg-light rounded text-center"><div class="small text-muted">Foyda</div><div class="h5 mb-0 fw-bold text-info">\' + fmt(profitValue) + \'</div></div></div></div>\' +'
  );
  lines.push(
    '        \'<div class="table-responsive" style="max-height:400px;border-radius:10px">\' +'
  );
  lines.push(
    '        \'<table class="table table-sm table-hover align-middle mb-0"><thead class="table-light sticky-top"><tr>\' +'
  );
  lines.push(
    "        '<th>Nomi</th><th>Kategoriya</th><th>Soni</th><th>Tannarx</th><th>Sotish</th><th>Poyda</th>' +"
  );
  lines.push(
    "        '</tr></thead><tbody>' + productsRowsHTML + '</tbody>' +"
  );
  lines.push(
    '        \'<tfoot class="table-light fw-bold"><tr><td colspan="2">JAMI:</td><td>\' + fmt(productsStats.totalStock) + \'</td><td colspan="2">-</td><td class="text-info">\' + fmt(profitValue) + \'</td></tr></tfoot>\' +'
  );
  lines.push("        '</table></div></div></div>';");
  lines.push("}");
  lines.push("");
  lines.push("body += '</div></div>' +");
  lines.push(
    '    \'<div class="modal fade" id="paymentModal" tabindex="-1">\' +'
  );
  lines.push(
    '    \'<div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow">\' +'
  );
  lines.push(
    "    '<div class=\"modal-header bg-primary text-white border-bottom-0 rounded-top\">' +"
  );
  lines.push("    '<h5 class=\"modal-title fw-bold\">Tolov qoshish</h5>' +");
  lines.push(
    '    \'<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>\' +'
  );
  lines.push(
    "    '<form method=\"POST\" action=\"/admin/users/' + user._id + '/payment\">' +"
  );
  lines.push("    '<div class=\"modal-body p-4\">' +");
  lines.push(
    '    \'<div class="mb-3"><label class="form-label fw-bold small">Amal turi</label>\' +'
  );
  lines.push("    '<div class=\"d-flex gap-2\">' +");
  lines.push(
    '    \'<input type="radio" class="btn-check" name="type" id="typePay" value="subtract" checked>\' +'
  );
  lines.push(
    '    \'<label class="btn btn-outline-success w-50" for="typePay"><i class="fas fa-hand-holding-usd me-1"></i>To\\\'lov</label>\' +'
  );
  lines.push(
    '    \'<input type="radio" class="btn-check" name="type" id="typeDebt" value="add">\' +'
  );
  lines.push(
    '    \'<label class="btn btn-outline-danger w-50" for="typeDebt"><i class="fas fa-file-invoice-dollar me-1"></i>Xarajat</label>\' +'
  );
  lines.push("    '</div></div>' +");
  lines.push(
    '    \'<div class="mb-3"><label class="form-label fw-bold small">Summa (so\\\'m)</label>\' +'
  );
  lines.push(
    '    \'<input type="number" class="form-control form-control-lg bg-light border-0 shadow-sm" name="amount" required min="100" step="100" placeholder="0"></div>\' +'
  );
  lines.push(
    '    \'<div class="mb-3"><label class="form-label fw-bold small text-muted">Izoh (ixtiyoriy)</label>\' +'
  );
  lines.push(
    '    \'<input type="text" class="form-control bg-light border-0 shadow-sm" name="notes" placeholder="To\\\'lov/Xarajat haqida malumot"></div>\' +'
  );
  lines.push(
    '    (hasOrders ? \'<div class="mb-3"><label class="form-label fw-bold small text-muted">Aynan bir buyurtma uchun (ixtiyoriy)</label>\' +'
  );
  lines.push(
    "    '<select class=\"form-select bg-light border-0 shadow-sm\" name=\"orderId\"><option value=\"\">Avtomatik (Eski qarzlardan)</option>' + orderOptionsHTML + '</select></div>' : '') +"
  );
  lines.push(
    "    '</div><div class=\"modal-footer border-top-0 px-4 pb-4\">' +"
  );
  lines.push(
    '    \'<button type="button" class="btn btn-light px-4" data-bs-dismiss="modal">Bekor qilish</button>\' +'
  );
  lines.push(
    '    \'<button type="submit" class="btn btn-primary px-4 shadow">Saqlash</button>\' +'
  );
  lines.push("    '</div></form></div></div></div>';");
  lines.push("-%>");
  lines.push("<%- include(layout, { body: body, title: title }) %>");
  return lines.join("\n");
}

// ===================== WRITE AND TEST =====================
var files = {
  "users.ejs": buildUsersEjs(),
  "user-details.ejs": buildUserDetailsEjs(),
};

var allOk = true;

for (var name in files) {
  var filePath = path.join(viewsDir, name);
  fs.writeFileSync(filePath, files[name], "utf8");

  var written = fs.readFileSync(filePath, "utf8");
  try {
    ejs.compile(written, { filename: filePath });
    console.log("OK - " + name);
  } catch (e) {
    console.log("FAIL - " + name + ": " + e.message);
    allOk = false;
  }
}

// dashboard.ejs
var dashPath = path.join(viewsDir, "dashboard.ejs");
var dashContent = fs.readFileSync(dashPath, "utf8");
try {
  ejs.compile(dashContent, { filename: dashPath });
  console.log("OK - dashboard.ejs");
} catch (e) {
  console.log("FAIL - dashboard.ejs: " + e.message);
  allOk = false;
}

// Check User model default
var { connectDB } = require("./src/utils/config");
var { User } = require("./src/server/models");
connectDB().then(function () {
  var tempUser = new User({
    telegramId: "verify_" + Date.now(),
    firstName: "Test",
  });
  console.log("isBlocked default: " + tempUser.isBlocked);

  if (allOk && tempUser.isBlocked === true) {
    console.log("\n=== ALL CHECKS PASSED ===");
  } else {
    console.log("\n=== SOME CHECKS FAILED ===");
  }
  process.exit(0);
});

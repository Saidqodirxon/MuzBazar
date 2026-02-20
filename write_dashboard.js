// Write dashboard.ejs correctly with proper line breaks
const fs = require("fs");
const path = require("path");

const content = `<%
var layout = '../layouts/layout.ejs';

function fmt(n) {
    var s = String(n || 0);
    var parts = [];
    var len = s.length;
    for (var i = len; i > 0; i -= 3) {
        var start = Math.max(0, i - 3);
        parts.unshift(s.substring(start, i));
    }
    return parts.join(' ');
}

var lowStockHtml = '';
if (!lowStockProducts || lowStockProducts.length === 0) {
    lowStockHtml = '<p class="text-muted">Barcha mahsulotlar yetarli miqdorda mavjud</p>';
} else {
    lowStockHtml = '<div class="list-group">';
    for (var i = 0; i < lowStockProducts.length; i++) {
        var product = lowStockProducts[i];
        lowStockHtml += '<div class="list-group-item d-flex justify-content-between align-items-center">' +
            '<div><strong>' + product.name + '</strong><br><small class="text-muted">Minimal: ' + product.minStock + '</small></div>' +
            '<span class="badge bg-warning rounded-pill">' + product.stock + ' qoldi</span></div>';
    }
    lowStockHtml += '</div>';
}

var ordersHtml = '';
if (!recentOrders || recentOrders.length === 0) {
    ordersHtml = '<p class="text-muted">Hali buyurtmalar yo\\'q</p>';
} else {
    ordersHtml = '<div class="table-responsive"><table class="table table-hover">' +
        '<thead class="table-light"><tr>' +
        '<th>Buyurtma</th><th>Klient</th><th>Summa</th>' +
        '<th>To\\'langan</th><th>Qoldiq</th><th>Status</th><th>Sana</th><th>Amallar</th>' +
        '</tr></thead><tbody>';

    for (var j = 0; j < recentOrders.length; j++) {
        var order = recentOrders[j];
        var statusClass = 'secondary';
        var statusText = order.status || '';
        if (order.status === 'pending') { statusClass = 'warning'; statusText = 'Kutilmoqda'; }
        else if (order.status === 'confirmed') { statusClass = 'info'; statusText = 'Tasdiqlangan'; }
        else if (order.status === 'delivered') { statusClass = 'success'; statusText = 'Yetkazilgan'; }
        else if (order.status === 'cancelled') { statusClass = 'danger'; statusText = 'Bekor qilingan'; }

        var totalSum = order.totalSum || 0;
        var totalPaid = order.totalPaid || 0;
        var debt = order.debt || 0;
        var debtColor = debt > 0 ? 'text-danger' : 'text-success';

        var clientName = 'Noma\\'lum';
        if (order.client) {
            clientName = (order.client.firstName || '') + ' ' + (order.client.lastName || '');
        }

        var orderDate = moment(order.createdAt).utcOffset(5).format('DD/MM/YYYY HH:mm');

        ordersHtml += '<tr>' +
            '<td><strong>' + (order.orderNumber || '') + '</strong></td>' +
            '<td>' + clientName + '</td>' +
            '<td>' + fmt(totalSum) + ' so\\'m</td>' +
            '<td class="text-success">' + fmt(totalPaid) + ' so\\'m</td>' +
            '<td class="' + debtColor + '"><strong>' + fmt(debt) + ' so\\'m</strong></td>' +
            '<td><span class="badge bg-' + statusClass + '">' + statusText + '</span></td>' +
            '<td>' + orderDate + '</td>' +
            '<td><a href="/admin/orders/' + order._id + '" class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></a></td>' +
            '</tr>';
    }
    ordersHtml += '</tbody></table></div>';
}

var body = '<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pb-2 mb-3 border-bottom">' +
    '<h1 class="h2"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</h1>' +
    '<div class="btn-toolbar mb-2 mb-md-0"><div class="btn-group me-2">' +
    '<a href="/admin/reports/export" class="btn btn-sm btn-outline-secondary"><i class="fas fa-download me-1"></i>Export</a>' +
    '</div></div></div>' +
    '<div class="row mb-4">' +
    '<div class="col-xl-3 col-md-6 mb-4"><div class="card stat-card"><div class="card-body text-center">' +
    '<div class="row no-gutters align-items-center"><div class="col">' +
    '<div class="h5 font-weight-bold mb-1">' + stats.totalProducts + '</div>' +
    '<div class="small">Mahsulotlar</div></div>' +
    '<div class="col-auto"><i class="fas fa-box fa-2x text-white-50"></i></div></div></div></div></div>' +
    '<div class="col-xl-3 col-md-6 mb-4"><div class="card stat-card"><div class="card-body text-center">' +
    '<div class="row no-gutters align-items-center"><div class="col">' +
    '<div class="h5 font-weight-bold mb-1">' + stats.totalOrders + '</div>' +
    '<div class="small">Buyurtmalar</div></div>' +
    '<div class="col-auto"><i class="fas fa-shopping-cart fa-2x text-white-50"></i></div></div></div></div></div>' +
    '<div class="col-xl-3 col-md-6 mb-4"><div class="card stat-card"><div class="card-body text-center">' +
    '<div class="row no-gutters align-items-center"><div class="col">' +
    '<div class="h5 font-weight-bold mb-1">' + fmt(stats.totalDebt) + ' so\\'m</div>' +
    '<div class="small">Umumiy qarzdorlik</div></div>' +
    '<div class="col-auto"><i class="fas fa-money-bill-wave fa-2x text-white-50"></i></div></div></div></div></div>' +
    '<div class="col-xl-3 col-md-6 mb-4"><div class="card stat-card"><div class="card-body text-center">' +
    '<div class="row no-gutters align-items-center"><div class="col">' +
    '<div class="h5 font-weight-bold mb-1">' + stats.todayOrders + '</div>' +
    '<div class="small">Bugungi buyurtmalar</div></div>' +
    '<div class="col-auto"><i class="fas fa-calendar-day fa-2x text-white-50"></i></div></div></div></div></div>' +
    '</div>' +
    '<div class="row mb-4">' +
    '<div class="col-xl-4 col-md-6 mb-4"><div class="card border-left-primary shadow h-100 py-2"><div class="card-body">' +
    '<div class="row no-gutters align-items-center"><div class="col mr-2">' +
    '<div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Bugungi savdo</div>' +
    '<div class="h5 mb-0 font-weight-bold text-gray-800">' + fmt(stats.todaySales) + ' so\\'m</div>' +
    '</div><div class="col-auto"><i class="fas fa-chart-line fa-2x text-gray-300"></i></div></div></div></div></div>' +
    '<div class="col-xl-4 col-md-6 mb-4"><div class="card border-left-success shadow h-100 py-2"><div class="card-body">' +
    '<div class="row no-gutters align-items-center"><div class="col mr-2">' +
    '<div class="text-xs font-weight-bold text-success text-uppercase mb-1">Bugungi to\\'lovlar</div>' +
    '<div class="h5 mb-0 font-weight-bold text-gray-800">' + fmt(stats.todayRevenue) + ' so\\'m</div>' +
    '</div><div class="col-auto"><i class="fas fa-dollar-sign fa-2x text-gray-300"></i></div></div></div></div></div>' +
    '<div class="col-xl-4 col-md-6 mb-4"><div class="card border-left-info shadow h-100 py-2"><div class="card-body">' +
    '<div class="row no-gutters align-items-center"><div class="col mr-2">' +
    '<div class="text-xs font-weight-bold text-info text-uppercase mb-1">Bugungi foyda</div>' +
    '<div class="h5 mb-0 font-weight-bold text-gray-800">' + fmt(stats.todayProfit) + ' so\\'m</div>' +
    '</div><div class="col-auto"><i class="fas fa-coins fa-2x text-gray-300"></i></div></div></div></div></div>' +
    '</div>' +
    '<div class="row mb-4">' +
    '<div class="col-md-6"><div class="card"><div class="card-header">' +
    '<h5><i class="fas fa-plus-circle me-2"></i>Tezkor harakatlar</h5></div>' +
    '<div class="card-body"><div class="d-grid gap-2">' +
    '<a href="/admin/products/new" class="btn btn-primary"><i class="fas fa-plus me-2"></i>Yangi mahsulot</a>' +
    '<a href="/admin/categories/new" class="btn btn-outline-primary"><i class="fas fa-tags me-2"></i>Yangi kategoriya</a>' +
    '<a href="/admin/debts" class="btn btn-outline-warning"><i class="fas fa-money-bill-wave me-2"></i>Qarzdorlik boshqaruvi</a>' +
    '</div></div></div></div>' +
    '<div class="col-md-6"><div class="card"><div class="card-header">' +
    '<h5><i class="fas fa-exclamation-triangle me-2"></i>Kam qolgan mahsulotlar</h5></div>' +
    '<div class="card-body">' + lowStockHtml + '</div></div></div>' +
    '</div>' +
    '<div class="row"><div class="col-12"><div class="card">' +
    '<div class="card-header d-flex justify-content-between align-items-center">' +
    '<h5><i class="fas fa-clock me-2"></i>So\\'nggi buyurtmalar</h5>' +
    '<a href="/admin/orders" class="btn btn-sm btn-outline-primary">Barchasini ko\\'rish</a></div>' +
    '<div class="card-body">' + ordersHtml + '</div></div></div></div>';
-%>
<%- include(layout, { body: body, title: title }) %>
`;

const filePath = path.join(__dirname, "src", "views", "admin", "dashboard.ejs");
fs.writeFileSync(filePath, content, "utf8");

// Verify
const ejs = require("ejs");
const written = fs.readFileSync(filePath, "utf8");
try {
  ejs.compile(written, { filename: filePath });
  console.log("SUCCESS - dashboard.ejs compiled OK");
  console.log("Lines:", written.split("\\n").length);
} catch (e) {
  console.log("FAIL:", e.message);
}

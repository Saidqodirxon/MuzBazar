const ejs = require('ejs');
const fs = require('fs');

try {
    const content = fs.readFileSync('src/views/admin/order-details.ejs', 'utf-8');
    ejs.compile(content, { filename: 'order-details.ejs' });
    console.log('✅ order-details.ejs TO\'G\'RI!');
} catch (err) {
    console.log('❌ XATO:', err.message);
    console.log(err.stack);
}

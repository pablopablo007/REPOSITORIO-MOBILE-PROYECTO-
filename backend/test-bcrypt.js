const bcrypt = require('bcryptjs');
const hash = '$2b$10$RSKlSP4Loai4kOd/iHYDGekzjDUvKNcfllc.UGBBrHQOSXxbQGgjC';
bcrypt.compare('123456', hash).then(res => console.log('Match 123456:', res));

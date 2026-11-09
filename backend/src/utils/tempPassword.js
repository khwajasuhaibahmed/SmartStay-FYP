const crypto = require('crypto');

// 10 characters, without look-alike characters (0/O, 1/l/I).
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i += 1) password += chars[crypto.randomInt(chars.length)];
  return password;
}

module.exports = generateTempPassword;

// Run this script to generate bcrypt hashes for create_db.sql seed passwords:
// node scripts/gen-hashes.js
//
// After running, replace the plaintext passwords in create_db.sql with the output.
const bcrypt = require('bcryptjs');
const passwords = [
  { user: 'admin', pass: 'francis123' },
  { user: 'andrea.mendoza', pass: 'andrea123' },
  { user: 'luis.ramos', pass: 'luis123' },
  { user: 'mika.santos', pass: 'mika123' },
  { user: 'paolo.reyes', pass: 'paolo123' },
];
passwords.forEach(({ user, pass }) => {
  console.log(`${user} (${pass}): ${bcrypt.hashSync(pass, 10)}`);
});

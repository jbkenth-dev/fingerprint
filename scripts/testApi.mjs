// Simple API smoke-test script. Run with: node scripts/testApi.mjs
import assert from 'assert';

const base = process.env.TEST_BASE || 'http://localhost/fingerprint';

async function checkUsers() {
  const url = `${base}/api/users.php`;
  const res = await fetch(url);
  assert(res.ok, `GET ${url} returned ${res.status}`);
  const data = await res.json();
  console.log('GET /users.php ->', Array.isArray(data) ? `${data.length} users` : data);
}

async function checkAuth() {
  const users = await fetch(`${base}/api/users.php`).then((res) => res.json());
  const admin = Array.isArray(users) ? users.find((user) => user.role === 'admin' && user.status === 'Active') : null;
  assert(admin, 'No active admin user found for auth test');

  const url = `${base}/api/auth.php`;
  const payload = {
    identifier: admin.username || admin.email,
    password: admin.password,
    role: 'admin',
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${JSON.stringify(data)}`);
  console.log('POST /auth.php ->', data.user ? `user ${data.user.email}` : data);
}

async function checkClassSubjects() {
  const url = `${base}/api/class-subjects.php`;
  const res = await fetch(url);
  assert(res.ok, `GET ${url} returned ${res.status}`);
  const data = await res.json();
  console.log('GET /class-subjects.php ->', Array.isArray(data) ? `${data.length} subjects` : data);
}

async function checkClassSchedules() {
  const url = `${base}/api/class-schedules.php`;
  const res = await fetch(url);
  assert(res.ok, `GET ${url} returned ${res.status}`);
  const data = await res.json();
  console.log('GET /class-schedules.php ->', Array.isArray(data) ? `${data.length} schedule rows` : data);
}

async function run() {
  try {
    await checkUsers();
    await checkAuth();
    await checkClassSubjects();
    await checkClassSchedules();
    console.log('API smoke tests passed (server must be running).');
  } catch (err) {
    console.error('API smoke tests failed:', err.message);
    process.exitCode = 1;
  }
}

run();

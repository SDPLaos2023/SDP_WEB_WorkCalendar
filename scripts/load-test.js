import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Test Script for Work Calendar
// To run: k6 run load-test.js

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 500 },  // Stay at 500 users
    { duration: '1m', target: 1000 }, // Peak at 1000 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Visit Login Page
  let res = http.get(`${BASE_URL}/login`);
  check(res, { 'login status is 200': (r) => r.status === 200 });

  // 2. Fetch Dashboard Summary (The heavy endpoint we optimized)
  // Note: In a real test, you'd need an Auth Token
  let dashboardRes = http.get(`${BASE_URL}/api/dashboard/summary`);
  check(dashboardRes, { 'dashboard status is 200/304': (r) => r.status === 200 || r.status === 304 });

  sleep(1);
}

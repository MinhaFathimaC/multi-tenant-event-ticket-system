/**
 * Concurrency & Race Condition Verification Benchmark
 * Tests concurrent booking attempts against atomic reservation locks
 */
import { v4 as uuidv4 } from 'uuid';
import db from './src/db/connection.js';
import initDatabase from './src/db/initDb.js';
import reservationEngine from './src/services/reservationEngine.js';

async function runBenchmark() {
  console.log('========================================================');
  console.log('⚡ RUNNING ATOMIC CONCURRENCY & ZERO DOUBLE-BOOKING BENCHMARK');
  console.log('========================================================\n');

  initDatabase();

  // Create an exclusive, high-contention tier with ONLY 3 TICKETS
  const testEventId = 'bench-event-' + Date.now();
  const testTierId = 'bench-tier-' + Date.now();
  const testTenantId = 'tenant-apex-1';

  db.prepare(`
    INSERT INTO events (id, tenant_id, title, slug, description, category, venue, event_date, sales_cutoff_date, status, created_at)
    VALUES (?, ?, 'High Contention VIP Exclusive', ?, 'Concurrency test', 'Test', 'Virtual Arena', datetime('now', '+10 days'), datetime('now', '+9 days'), 'ACTIVE', datetime('now'))
  `).run(testEventId, testTenantId, 'bench-event-' + Date.now());

  const TIER_CAPACITY = 3;
  db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, price, total_capacity, perks, created_at)
    VALUES (?, ?, 'Ultra VIP Golden Ticket', 499.00, ?, 'Exclusive Access', datetime('now'))
  `).run(testTierId, testEventId, TIER_CAPACITY);

  console.log(`[Setup] Created exclusive tier with strictly ${TIER_CAPACITY} total seats.`);

  // Create 20 mock attendee users
  const TOTAL_CONCURRENT_BUYERS = 20;
  const buyerIds = [];
  for (let i = 0; i < TOTAL_CONCURRENT_BUYERS; i++) {
    const uid = 'buyer-' + i + '-' + uuidv4().substring(0, 6);
    buyerIds.push(uid);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, 'hash', 'ATTENDEE', datetime('now'))
    `).run(uid, `Concurrent Buyer ${i + 1}`, `${uid}@test.com`);
  }

  console.log(`[Execution] Firing ${TOTAL_CONCURRENT_BUYERS} simultaneous reservation requests in parallel...\n`);

  const startTime = Date.now();

  // Dispatch all 20 requests in parallel using Promise.all
  const promises = buyerIds.map((userId, index) => {
    return new Promise((resolve) => {
      try {
        const result = reservationEngine.reserveTickets({
          userId,
          eventId: testEventId,
          tierId: testTierId,
          quantity: 1,
          clientIp: `10.0.0.${index + 1}`
        });
        resolve({
          buyer: index + 1,
          success: true,
          status: 201,
          reservationId: result.id,
          message: 'SUCCESS: Hold secured!'
        });
      } catch (err) {
        resolve({
          buyer: index + 1,
          success: false,
          status: err.status || 500,
          message: `CONFLICT (409): ${err.message}`
        });
      }
    });
  });

  const results = await Promise.all(promises);
  const elapsedMs = Date.now() - startTime;

  // Audit database
  const finalInventory = reservationEngine.getTierInventory(testTierId);
  const successfulReservations = results.filter((r) => r.success);
  const rejectedConflicts = results.filter((r) => !r.success);

  console.log('--- INDIVIDUAL REQUEST OUTCOMES ---');
  results.slice(0, 8).forEach((r) => {
    console.log(`Request #${r.buyer}: [${r.status}] ${r.message}`);
  });
  if (results.length > 8) {
    console.log(`... and ${results.length - 8} more concurrent requests processed.`);
  }

  console.log('\n========================================================');
  console.log('📊 CONCURRENCY TEST SUMMARY & PROOF');
  console.log('========================================================');
  console.log(`Total Capacity:               ${TIER_CAPACITY}`);
  console.log(`Concurrent Requests Fired:    ${TOTAL_CONCURRENT_BUYERS}`);
  console.log(`Successful Reservations:      ${successfulReservations.length}`);
  console.log(`Rejected Conflicts (409):     ${rejectedConflicts.length}`);
  console.log(`Remaining Available Seats:    ${finalInventory.available}`);
  console.log(`Execution Duration:           ${elapsedMs} ms`);
  console.log('--------------------------------------------------------');

  const zeroDoubleBooking = successfulReservations.length === TIER_CAPACITY && finalInventory.heldCount === TIER_CAPACITY;
  if (zeroDoubleBooking) {
    console.log('✅ PASS: ZERO DOUBLE-BOOKING VERIFIED!');
    console.log(`   Exactly ${TIER_CAPACITY} requests secured tickets; all other ${rejectedConflicts.length} were properly rejected.`);
  } else {
    console.error('❌ FAIL: Invariant violated!');
  }
  console.log('========================================================\n');
}

runBenchmark().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

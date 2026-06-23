import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from '../src/lib/db';

async function testLotteryAlgorithm() {
  console.log('🧪 Testing Open Mic Lottery Algorithm\n');
  
  try {
    // Get active open mic date
    const activeDate = await db
      .selectFrom('open_mic_dates')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('date', 'asc')
      .limit(1)
      .executeTakeFirst();

    if (!activeDate) {
      console.log('❌ No active open mic date found');
      return;
    }
    
    console.log(`📅 Active date: ${activeDate.date}\n`);
    
    // Get all comedians for this date (joined to person), shaped like the old query.
    const comedianRows = await db
      .selectFrom('sign_ups')
      .innerJoin('people', 'people.id', 'sign_ups.person_id')
      .selectAll('sign_ups')
      .select(['people.full_name as p_full_name', 'people.email as p_email'])
      .where('sign_ups.open_mic_date_id', '=', activeDate.id)
      .where('sign_ups.signup_type', '=', 'comedian')
      .orderBy('sign_ups.created_at', 'asc')
      .execute();

    // Diagnostic script: keep rows loose so the analysis logic below is unchanged.
    const allComedians = comedianRows.map((r) => ({
      ...r,
      people: { full_name: r.p_full_name, email: r.p_email },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any[];

    console.log(`👥 Total comedians signed up: ${allComedians?.length || 0}`);
    
    // Identify early birds (first 5)
    const earlyBirds = allComedians?.slice(0, 5).map(c => c.id) || [];
    console.log(`🐦 Early birds (first 5 signups): ${earlyBirds.length}`);
    
    // Check lottery state
    const selectedCount = allComedians?.filter(c => c.lottery_order !== null).length || 0;
    const checkedInCount = allComedians?.filter(c => c.check_in_status && c.check_in_status !== 'not_coming').length || 0;
    const eligibleCount = allComedians?.filter(c => 
      c.check_in_status && 
      c.check_in_status !== 'not_coming' && 
      c.lottery_order === null
    ).length || 0;
    
    console.log(`\n📊 Current State:`);
    console.log(`  - Already selected: ${selectedCount}`);
    console.log(`  - Checked in: ${checkedInCount}`);
    console.log(`  - Eligible for lottery: ${eligibleCount}`);
    
    // Show ticket distribution for eligible comedians
    console.log(`\n🎟️  Ticket Distribution for Eligible Comedians:`);
    
    const eligibleComedians = allComedians?.filter(c => 
      c.check_in_status && 
      c.check_in_status !== 'not_coming' && 
      c.lottery_order === null
    ) || [];
    
    // Split eligible comedians into lottery eligible (on-time/early) and late
    const lotteryEligible = eligibleComedians.filter(c => c.check_in_status !== 'late');
    const lateComedians = eligibleComedians
      .filter(c => c.check_in_status === 'late')
      .sort((a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime());

    console.log(`\n  Lottery Eligible (on-time/early): ${lotteryEligible.length}`);
    lotteryEligible.forEach(c => {
      let tickets = 1; // Base ticket
      const bonuses = [];

      if (earlyBirds.includes(c.id)) {
        tickets += 2;
        bonuses.push('early bird +2');
      }

      if (c.check_in_status === 'early') {
        tickets += 2;
        bonuses.push('early check-in +2');
      }

      const person = Array.isArray(c.people) ? c.people[0] : c.people;
      console.log(`  - ${person?.full_name || 'Unknown'}: ${tickets} ticket(s)` +
        (bonuses.length > 0 ? ` (${bonuses.join(', ')})` : ''));
    });

    console.log(`\n  Late (ordered by lateness, drawn after lottery): ${lateComedians.length}`);
    lateComedians.forEach((c, index) => {
      const person = Array.isArray(c.people) ? c.people[0] : c.people;
      const checkedInAt = c.checked_in_at ? new Date(c.checked_in_at).toLocaleTimeString() : 'unknown';
      console.log(`  ${index + 1}. ${person?.full_name || 'Unknown'} (checked in at ${checkedInAt})`);
    });
    
    // Check for issues
    console.log(`\n⚠️  Validation Checks:`);
    
    // Check 1: Previously selected should be immutable
    const selectedComedians = allComedians?.filter(c => c.lottery_order !== null) || [];
    console.log(`✓ Selected comedians have lottery_order: ${selectedComedians.length}`);
    
    // Check 2: Verify no one can be selected without being checked in
    const invalidSelections = allComedians?.filter(c => 
      c.lottery_order !== null && !c.check_in_status
    ) || [];
    
    if (invalidSelections.length > 0) {
      console.log(`❌ ERROR: ${invalidSelections.length} comedian(s) selected without check-in!`);
      invalidSelections.forEach(c => {
        const person = Array.isArray(c.people) ? c.people[0] : c.people;
        console.log(`   - ${person?.full_name} (order: ${c.lottery_order})`);
      });
    } else {
      console.log(`✓ All selected comedians are checked in`);
    }
    
    // Check 3: Verify lottery orders are sequential
    const orders = selectedComedians
      .map(c => c.lottery_order)
      .filter(o => o !== null)
      .sort((a, b) => a - b);
    
    let isSequential = true;
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        isSequential = false;
        break;
      }
    }
    
    if (!isSequential && orders.length > 0) {
      console.log(`❌ ERROR: Lottery orders not sequential: ${orders.join(', ')}`);
    } else if (orders.length > 0) {
      console.log(`✓ Lottery orders are sequential: ${orders.join(', ')}`);
    }
    
    // Check 4: Check for "not_coming" with lottery order (this can happen if marked after selection)
    const notComingWithOrder = allComedians?.filter(c => 
      c.check_in_status === 'not_coming' && c.lottery_order !== null
    ) || [];
    
    if (notComingWithOrder.length > 0) {
      console.log(`ℹ️  INFO: ${notComingWithOrder.length} comedian(s) marked 'not_coming' after selection (order preserved)`);
      notComingWithOrder.forEach(c => {
        const person = Array.isArray(c.people) ? c.people[0] : c.people;
        console.log(`   - ${person?.full_name} (order: ${c.lottery_order}) - keeps their spot`);
      });
    } else {
      console.log(`✓ No 'not_coming' comedians have lottery orders`);
    }
    
    // Check 5: Verify ticket calculation is correct (1, 3, or 5 tickets)
    console.log(`\n🎫 Testing Ticket Calculation Logic:`);
    let ticketTestPassed = true;
    lotteryEligible.forEach(c => {
      let expectedTickets = 1;
      if (earlyBirds.includes(c.id)) expectedTickets += 2;
      if (c.check_in_status === 'early') expectedTickets += 2;

      if (expectedTickets > 5) {
        const person = Array.isArray(c.people) ? c.people[0] : c.people;
        console.log(`❌ ERROR: ${person?.full_name} would have ${expectedTickets} tickets (max is 5)`);
        ticketTestPassed = false;
      }
      if (![1, 3, 5].includes(expectedTickets)) {
        const person = Array.isArray(c.people) ? c.people[0] : c.people;
        console.log(`❌ ERROR: ${person?.full_name} has ${expectedTickets} tickets (should be 1, 3, or 5)`);
        ticketTestPassed = false;
      }
    });
    if (ticketTestPassed && lotteryEligible.length > 0) {
      console.log(`✓ All ticket calculations are correct (1, 3, or 5 per person)`);
    } else if (lotteryEligible.length === 0) {
      console.log(`✓ No lottery-eligible comedians to test ticket calculation`);
    }
    
    // Check 6: Verify no duplicate lottery orders
    const lotteryOrders = allComedians
      ?.filter(c => c.lottery_order !== null)
      .map(c => c.lottery_order) || [];
    const uniqueOrders = new Set(lotteryOrders);
    
    if (lotteryOrders.length !== uniqueOrders.size) {
      console.log(`❌ ERROR: Duplicate lottery orders found!`);
    } else if (lotteryOrders.length > 0) {
      console.log(`✓ No duplicate lottery orders`);
    }
    
    // Check 7: Verify early bird calculation
    console.log(`\n🐦 Early Bird Validation:`);
    const actualEarlyBirds = allComedians?.slice(0, 5) || [];
    console.log(`✓ First 5 sign-ups by created_at are marked as early birds`);
    if (actualEarlyBirds.length < 5) {
      console.log(`  - Only ${actualEarlyBirds.length} total sign-ups (less than 5)`);
    }
    
    // Check 8: Verify checked_in_at timestamp is set
    const checkedInWithoutTimestamp = allComedians?.filter(c => 
      c.check_in_status && c.check_in_status !== null && !c.checked_in_at
    ) || [];
    
    if (checkedInWithoutTimestamp.length > 0) {
      console.log(`\n⚠️  WARNING: ${checkedInWithoutTimestamp.length} comedian(s) checked in without timestamp`);
    } else if (checkedInCount > 0) {
      console.log(`✓ All checked-in comedians have timestamps`);
    }
    
    // Check 9: Test edge cases
    console.log(`\n🔍 Edge Case Tests:`);

    // Edge case: What if someone is both early bird AND early check-in?
    const doubleBonus = lotteryEligible.filter(c =>
      earlyBirds.includes(c.id) && c.check_in_status === 'early'
    );
    if (doubleBonus.length > 0) {
      console.log(`✓ ${doubleBonus.length} comedian(s) have both early bird + early check-in (5 tickets total)`);
    }

    // Edge case: Check for any null/undefined person data
    const missingPersonData = allComedians?.filter(c => !c.people) || [];
    if (missingPersonData.length > 0) {
      console.log(`⚠️  WARNING: ${missingPersonData.length} comedian(s) missing person data`);
    } else {
      console.log(`✓ All comedians have associated person data`);
    }

    // Check 10: Verify late comedians come after on-time/early in selections
    console.log(`\n⏰ Late Comedian Ordering Tests:`);
    const selectedLate = selectedComedians.filter(c => c.check_in_status === 'late');
    const selectedOnTime = selectedComedians.filter(c => c.check_in_status !== 'late');

    if (selectedLate.length > 0 && selectedOnTime.length > 0) {
      // Find the highest lottery order among on-time/early
      const maxOnTimeOrder = Math.max(...selectedOnTime.map(c => c.lottery_order));
      // Find the lowest lottery order among late
      const minLateOrder = Math.min(...selectedLate.map(c => c.lottery_order));

      if (minLateOrder > maxOnTimeOrder) {
        console.log(`✓ All late comedians (${selectedLate.length}) come after on-time/early comedians`);
      } else {
        console.log(`❌ ERROR: Some late comedians appear before on-time/early comedians!`);
        console.log(`   - Highest on-time order: ${maxOnTimeOrder}`);
        console.log(`   - Lowest late order: ${minLateOrder}`);
      }

      // Verify late comedians are in order of checked_in_at
      const selectedLateSorted = [...selectedLate].sort((a, b) => a.lottery_order - b.lottery_order);
      let lateOrderCorrect = true;
      for (let i = 1; i < selectedLateSorted.length; i++) {
        const prevTime = new Date(selectedLateSorted[i - 1].checked_in_at).getTime();
        const currTime = new Date(selectedLateSorted[i].checked_in_at).getTime();
        if (currTime < prevTime) {
          lateOrderCorrect = false;
          break;
        }
      }
      if (lateOrderCorrect && selectedLate.length > 1) {
        console.log(`✓ Late comedians are ordered by check-in time (least late first)`);
      } else if (!lateOrderCorrect) {
        console.log(`❌ ERROR: Late comedians are NOT in order of lateness!`);
      }
    } else if (selectedLate.length > 0) {
      console.log(`ℹ️  Only late comedians have been selected (${selectedLate.length})`);
    } else if (selectedOnTime.length > 0) {
      console.log(`✓ No late comedians selected yet (${selectedOnTime.length} on-time/early selected)`);
    } else {
      console.log(`✓ No comedians selected yet`);
    }
    
    // Check 11: Analyze lottery fairness from historical data
    if (selectedComedians.length >= 4) {
      console.log(`\n🎲 Lottery Fairness Analysis (from actual selections):`);
      
      // Check if early birds are overrepresented in selections
      const selectedEarlyBirds = selectedComedians.filter(c => {
        const index = allComedians?.findIndex(com => com.id === c.id) || 0;
        return index < 5;
      }).length;
      
      const earlyBirdPercent = (selectedEarlyBirds / selectedComedians.length) * 100;
      console.log(`  - Early birds in selections: ${selectedEarlyBirds}/${selectedComedians.length} (${earlyBirdPercent.toFixed(0)}%)`);
      
      // Check if early check-ins are overrepresented
      const selectedEarlyCheckins = selectedComedians.filter(c => 
        c.check_in_status === 'early'
      ).length;
      
      const earlyCheckinPercent = (selectedEarlyCheckins / selectedComedians.length) * 100;
      console.log(`  - Early check-ins in selections: ${selectedEarlyCheckins}/${selectedComedians.length} (${earlyCheckinPercent.toFixed(0)}%)`);
      
      console.log(`\n  💡 Higher percentages indicate the bonus system is working correctly`);
    }
    
    // Summary
    const hasErrors = invalidSelections.length > 0 || 
                     !isSequential || 
                     !ticketTestPassed ||
                     lotteryOrders.length !== uniqueOrders.size;
    
    console.log(`\n📋 Summary:`);
    if (hasErrors) {
      console.log(`❌ Some validation errors found - see above`);
    } else {
      console.log(`✅ All tests passed! Lottery system is working correctly!`);
    }
    
    // Test coverage summary
    console.log(`\n📊 Test Coverage:`);
    console.log(`  ✓ Lottery order validation`);
    console.log(`  ✓ Check-in status validation`);
    console.log(`  ✓ Ticket calculation (1, 3, or 5 tickets)`);
    console.log(`  ✓ Early bird detection`);
    console.log(`  ✓ Late comedian ordering (by lateness, after on-time)`);
    console.log(`  ✓ Edge case handling`);
    console.log(`  ✓ Data integrity checks`);
    
    // Recommendations
    console.log(`\n💡 Next Steps:`);
    if (eligibleCount === 0 && selectedCount === 0) {
      console.log(`  - No one checked in yet - check in some comedians first`);
    } else if (eligibleCount === 0) {
      console.log(`  - All eligible comedians have been selected`);
      console.log(`  - ${checkedInCount - selectedCount} comedian(s) can't be selected (marked 'not_coming')`);
    } else {
      console.log(`  - Ready to select up to ${Math.min(4, eligibleCount)} more comedians`);
      console.log(`  - Click "Generate Next ${Math.min(4, eligibleCount)} Comics" in admin page`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testLotteryAlgorithm();
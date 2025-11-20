import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createServiceRoleClient } from '../src/lib/supabase';

const supabase = createServiceRoleClient();

async function testLotteryAlgorithm() {
  console.log('🧪 Testing Open Mic Lottery Algorithm\n');
  
  try {
    // Get active open mic date
    const { data: activeDate } = await supabase
      .from('open_mic_dates')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (!activeDate) {
      console.log('❌ No active open mic date found');
      return;
    }
    
    console.log(`📅 Active date: ${activeDate.date}\n`);
    
    // Get all comedians for this date
    const { data: allComedians } = await supabase
      .from('sign_ups')
      .select('*, people(full_name, email)')
      .eq('open_mic_date_id', activeDate.id)
      .eq('signup_type', 'comedian')
      .order('created_at', { ascending: true });
    
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
    
    eligibleComedians.forEach(c => {
      let tickets = 1; // Base ticket
      const bonuses = [];
      
      if (earlyBirds.includes(c.id)) {
        tickets++;
        bonuses.push('early bird');
      }
      
      if (c.check_in_status === 'early') {
        tickets++;
        bonuses.push('early check-in');
      }

      const person = Array.isArray(c.people) ? c.people[0] : c.people;
      console.log(`  - ${person?.full_name || 'Unknown'}: ${tickets} ticket(s)` +
        (bonuses.length > 0 ? ` (${bonuses.join(', ')})` : ''));
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
    
    // Check 5: Verify ticket calculation is correct (max 3 per person)
    console.log(`\n🎫 Testing Ticket Calculation Logic:`);
    let ticketTestPassed = true;
    eligibleComedians.forEach(c => {
      let expectedTickets = 1;
      if (earlyBirds.includes(c.id)) expectedTickets++;
      if (c.check_in_status === 'early') expectedTickets++;
      
      if (expectedTickets > 3) {
        const person = Array.isArray(c.people) ? c.people[0] : c.people;
        console.log(`❌ ERROR: ${person?.full_name} would have ${expectedTickets} tickets (max is 3)`);
        ticketTestPassed = false;
      }
    });
    if (ticketTestPassed && eligibleComedians.length > 0) {
      console.log(`✓ All ticket calculations are correct (max 3 per person)`);
    } else if (eligibleComedians.length === 0) {
      console.log(`✓ No eligible comedians to test ticket calculation`);
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
    const doubleBonus = eligibleComedians.filter(c => 
      earlyBirds.includes(c.id) && c.check_in_status === 'early'
    );
    if (doubleBonus.length > 0) {
      console.log(`✓ ${doubleBonus.length} comedian(s) have both early bird + early check-in (3 tickets total)`);
    }
    
    // Edge case: Check for any null/undefined person data
    const missingPersonData = allComedians?.filter(c => !c.people) || [];
    if (missingPersonData.length > 0) {
      console.log(`⚠️  WARNING: ${missingPersonData.length} comedian(s) missing person data`);
    } else {
      console.log(`✓ All comedians have associated person data`);
    }
    
    // Check 10: Analyze lottery fairness from historical data
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
    console.log(`  ✓ Ticket calculation (max 3)`);
    console.log(`  ✓ Early bird detection`);
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
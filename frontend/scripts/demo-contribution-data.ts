import { subDays, format } from 'date-fns'

const actions = [
  'create',
  'edit', 
  'publish',
  'add_partner',
  'update_partner',
  'add_transaction',
  'edit_transaction',
  'submit_validation',
  'validate',
]

function generateDemoContributions() {
  console.log('🎯 Generating demo contribution data...\n')
  
  const contributions = []
  const today = new Date()
  let totalActivities = 0
  let activeDays = 0
  
  // Generate activity logs for the past 365 days
  for (let i = 0; i < 365; i++) {
    const date = subDays(today, i)
    
    // Generate 0-5 activities per day with varying probability
    const rand = Math.random()
    let activityCount = 0
    
    if (rand < 0.3) {
      activityCount = 0 // 30% chance of no activity
    } else if (rand < 0.6) {
      activityCount = Math.floor(Math.random() * 3) + 1 // 30% chance of 1-3 activities
    } else if (rand < 0.85) {
      activityCount = Math.floor(Math.random() * 5) + 3 // 25% chance of 3-7 activities
    } else {
      activityCount = Math.floor(Math.random() * 10) + 8 // 15% chance of 8-17 activities
    }
    
    if (activityCount > 0) {
      activeDays++
      totalActivities += activityCount
      contributions.push({
        date: format(date, 'yyyy-MM-dd'),
        count: activityCount
      })
    }
  }
  
  // Calculate streaks
  let maxStreak = 0
  let currentStreak = 0
  let lastDate: Date | null = null
  
  contributions.sort((a, b) => a.date.localeCompare(b.date))
  
  contributions.forEach(({ date }) => {
    const currentDate = new Date(date)
    
    if (lastDate) {
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        currentStreak++
      } else {
        maxStreak = Math.max(maxStreak, currentStreak)
        currentStreak = 1
      }
    } else {
      currentStreak = 1
    }
    
    lastDate = currentDate
  })
  
  maxStreak = Math.max(maxStreak, currentStreak)
  
  // Calculate current streak from today
  let todayStreak = 0
  const sortedDesc = [...contributions].reverse()
  const todayFormatted = format(today, 'yyyy-MM-dd')
  
  for (let i = 0; i < sortedDesc.length; i++) {
    const checkDate = format(subDays(today, i), 'yyyy-MM-dd')
    const contribution = sortedDesc.find(c => c.date === checkDate)
    
    if (contribution) {
      todayStreak++
    } else if (i <= 1) {
      // Allow for missing today or yesterday to continue streak
      continue
    } else {
      break
    }
  }
  
  // Display summary
  console.log('📊 Demo Contribution Summary:')
  console.log('─'.repeat(40))
  console.log(`Total contributions: ${totalActivities}`)
  console.log(`Active days: ${activeDays} / 365`)
  console.log(`Activity rate: ${((activeDays / 365) * 100).toFixed(1)}%`)
  console.log(`Maximum streak: ${maxStreak} days`)
  console.log(`Current streak: ${todayStreak} days`)
  console.log(`Date range: ${contributions[0].date} to ${contributions[contributions.length - 1].date}`)
  
  // Show sample data
  console.log('\n📅 Sample contribution data (last 7 days):')
  console.log('─'.repeat(40))
  
  for (let i = 0; i < 7; i++) {
    const date = subDays(today, i)
    const formatted = format(date, 'yyyy-MM-dd')
    const contribution = contributions.find(c => c.date === formatted)
    const count = contribution?.count || 0
    const bar = '█'.repeat(Math.min(count, 20))
    const dayName = format(date, 'EEE')
    
    console.log(`${dayName} ${formatted}: ${bar} (${count})`)
  }
  
  // Show what the API response would look like
  console.log('\n🔄 Sample API Response Structure:')
  console.log('─'.repeat(40))
  console.log(JSON.stringify({
    contributions: contributions.slice(0, 3),
    summary: {
      total: totalActivities,
      activeDays: activeDays,
      maxStreak: maxStreak,
      currentStreak: todayStreak,
      startDate: contributions[0].date,
      endDate: contributions[contributions.length - 1].date
    }
  }, null, 2))
  
  console.log(`\n... and ${contributions.length - 3} more contribution entries`)
  
  console.log('\n✅ Demo data generation complete!')
  console.log('\n💡 To use real data:')
  console.log('1. Set up Supabase (see SUPABASE_SETUP_GUIDE.md)')
  console.log('2. Create .env.local with your Supabase credentials')
  console.log('3. Run: npm run seed:activity-logs')
}

// Run the demo
generateDemoContributions()
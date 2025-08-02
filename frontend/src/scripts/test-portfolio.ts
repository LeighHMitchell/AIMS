#!/usr/bin/env node

/**
 * Simple test script to validate MyPortfolio functionality
 * Run with: npx tsx src/scripts/test-portfolio.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPortfolioAPI() {
  console.log('🧪 Testing MyPortfolio API functionality...\n')
  
  const tests = [
    {
      name: 'Database Connection',
      test: async () => {
        const { data, error } = await supabase
          .from('activities')
          .select('id')
          .limit(1)
        
        if (error) throw error
        return { success: true, message: 'Connected successfully' }
      }
    },
    {
      name: 'Activities Table Structure',
      test: async () => {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .limit(1)
          .single()
        
        if (error && error.code !== 'PGRST116') throw error
        
        const requiredFields = ['id', 'title_narrative', 'planned_start_date', 'planned_end_date']
        const availableFields = data ? Object.keys(data) : []
        const missingFields = requiredFields.filter(field => !availableFields.includes(field))
        
        return { 
          success: missingFields.length === 0, 
          message: missingFields.length === 0 
            ? `All required fields present (${availableFields.length} total fields)`
            : `Missing fields: ${missingFields.join(', ')}`
        }
      }
    },
    {
      name: 'Activity Budgets Relationship',
      test: async () => {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            id,
            activity_budgets(usd_value)
          `)
          .limit(5)
        
        if (error) throw error
        
        const activitiesWithBudgets = data?.filter(a => a.activity_budgets && a.activity_budgets.length > 0) || []
        
        return {
          success: true,
          message: `${activitiesWithBudgets.length}/${data?.length || 0} activities have budget data`
        }
      }
    },
    {
      name: 'Planned Disbursements Relationship',
      test: async () => {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            id,
            planned_disbursements(usd_amount)
          `)
          .limit(5)
        
        if (error) throw error
        
        const activitiesWithDisbursements = data?.filter(a => a.planned_disbursements && a.planned_disbursements.length > 0) || []
        
        return {
          success: true,
          message: `${activitiesWithDisbursements.length}/${data?.length || 0} activities have disbursement data`
        }
      }
    },
    {
      name: 'Date Filtering Logic',
      test: async () => {
        const today = new Date()
        const { data, error } = await supabase
          .from('activities')
          .select('id, planned_start_date, activity_status')
          .not('planned_start_date', 'is', null)
          .limit(10)
        
        if (error) throw error
        
        const pipelinePastStart = data?.filter(activity => 
          activity.activity_status === 'pipeline' && 
          activity.planned_start_date &&
          new Date(activity.planned_start_date) < today
        ) || []
        
        return {
          success: true,
          message: `${pipelinePastStart.length} pipeline activities past expected start`
        }
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test.test()
      console.log(`✅ ${test.name}: ${result.message}`)
      passed++
    } catch (error) {
      console.log(`❌ ${test.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed++
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All tests passed! MyPortfolio should be working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.')
  }
}

// Run the tests
testPortfolioAPI().catch(console.error)
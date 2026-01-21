import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

interface ImportRequest {
  fields: Record<string, boolean>
  iati_data: any
  selectedFields: Array<{
    iatiPath: string
    category: string
    itemIndex?: number
    itemData?: any
  }>
}

interface ImportResponse {
  success: boolean
  updated_fields: string[]
  budgets_added: number
  budgets_updated: number
  documents_added: number
  documents_updated: number
  expenditures_added: number
  expenditures_updated: number
  errors?: string[]
  warnings?: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params)
    const organizationId = resolvedParams.id
    const body: ImportRequest = await request.json()
    const { fields, iati_data, selectedFields } = body
    const updatedFields: string[] = []
    const errors: string[] = []
    const warnings: string[] = []

    let budgetsAdded = 0
    let budgetsUpdated = 0
    let documentsAdded = 0
    let documentsUpdated = 0
    let expendituresAdded = 0
    let expendituresUpdated = 0

    // Group selected fields by category
    const selectedByIdentification = selectedFields.filter(f => f.category === 'identification')
    const selectedByCategory: Record<string, typeof selectedFields> = {}
    selectedFields.forEach(f => {
      if (!selectedByCategory[f.category]) {
        selectedByCategory[f.category] = []
      }
      selectedByCategory[f.category].push(f)
    })

    // Update identification fields
    if (selectedByIdentification.length > 0) {
      const updateData: Record<string, any> = {}

      for (const field of selectedByIdentification) {
        switch (field.iatiPath) {
          case 'organisation-identifier':
            updateData.iati_org_id = iati_data.identifier
            updatedFields.push('iati_org_id')
            break
          case 'name/narrative':
            updateData.name = iati_data.name
            updatedFields.push('name')
            break
          case 'reporting-org/@ref':
            updateData.reporting_org_ref = iati_data.reportingOrg?.ref
            updatedFields.push('reporting_org_ref')
            break
          case 'reporting-org/@type':
            updateData.reporting_org_type = iati_data.reportingOrg?.type
            updatedFields.push('reporting_org_type')
            break
          case 'reporting-org/narrative':
            updateData.reporting_org_name = iati_data.reportingOrg?.name || iati_data.reportingOrg?.names?.[0]?.narrative
            updatedFields.push('reporting_org_name')
            break
          case '@default-currency':
            updateData.default_currency = iati_data.defaultCurrency
            updatedFields.push('default_currency')
            break
          case '@xml:lang':
            updateData.default_language = iati_data.defaultLanguage
            updatedFields.push('default_language')
            break
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('organizations')
          .update(updateData)
          .eq('id', organizationId)

        if (error) {
          errors.push(`Failed to update identification fields: ${error.message}`)
        }
      }

      // Update organization names if name was imported
      if (updateData.name && iati_data.names && iati_data.names.length > 0) {
        // Delete existing names
        await supabase.from('organization_names').delete().eq('organization_id', organizationId)

        // Insert new names
        const nameData = iati_data.names.map((name: any) => ({
          organization_id: organizationId,
          language_code: name.language || 'en',
          narrative: name.narrative
        }))

        await supabase.from('organization_names').insert(nameData)
      }
    }

    // Process budgets selectively
    if (selectedByCategory['total-budgets'] || selectedByCategory['country-budgets'] || 
        selectedByCategory['region-budgets'] || selectedByCategory['org-budgets']) {
      
      // Process each selected field with its category to determine budget type
      const budgetsToImport = selectedFields
        .filter(f => ['total-budgets', 'country-budgets', 'region-budgets', 'org-budgets'].includes(f.category))
        .map(f => ({
          budget: f.itemData,
          category: f.category
        }))
        .filter(b => b.budget)

      for (const { budget, category } of budgetsToImport) {
        const budgetType = 
          category === 'total-budgets' ? 'total' :
          category === 'country-budgets' ? 'recipient-country' :
          category === 'region-budgets' ? 'recipient-region' :
          'recipient-org'

        // Try to find existing budget
        const matchQuery: any = {
          organization_id: organizationId,
          budget_type: budgetType,
          period_start: budget.periodStart,
          period_end: budget.periodEnd
        }

        if (budgetType === 'recipient-country' && budget.recipientCountry?.code) {
          matchQuery.recipient_ref = budget.recipientCountry.code
        } else if (budgetType === 'recipient-org' && budget.recipientOrg?.ref) {
          matchQuery.recipient_ref = budget.recipientOrg.ref
        } else if (budgetType === 'recipient-region' && budget.recipientRegion?.code) {
          matchQuery.recipient_ref = budget.recipientRegion.code
        }

        const { data: existing } = await supabase
          .from('organization_budgets')
          .select('id')
          .match(matchQuery)
          .maybeSingle()

        if (existing) {
          // Update existing
          const updateData: any = {
            budget_status: budget.status || '1',
            value: budget.value,
            currency: budget.currency || 'USD',
            value_date: budget.valueDate
          }

          if (budgetType === 'recipient-country') {
            updateData.recipient_ref = budget.recipientCountry?.code
          } else if (budgetType === 'recipient-org') {
            updateData.recipient_ref = budget.recipientOrg?.ref
            updateData.recipient_narrative = budget.recipientOrg?.name
          } else if (budgetType === 'recipient-region') {
            updateData.recipient_ref = budget.recipientRegion?.code
            updateData.recipient_vocabulary = budget.recipientRegion?.vocabulary
            updateData.recipient_vocabulary_uri = budget.recipientRegion?.vocabularyUri
          }

          await supabase
            .from('organization_budgets')
            .update(updateData)
            .eq('id', existing.id)

          // Delete existing budget lines and insert new ones
          await supabase.from('organization_budget_lines').delete().eq('budget_id', existing.id)

          if (budget.budgetLines && budget.budgetLines.length > 0) {
            const budgetLineData = budget.budgetLines.map((line: any) => ({
              budget_id: existing.id,
              ref: line.ref,
              value: line.value,
              currency: line.currency || 'USD',
              value_date: line.valueDate,
              narrative: line.narrative,
              language_code: 'en'
            }))

            await supabase.from('organization_budget_lines').insert(budgetLineData)
          }

          budgetsUpdated++
        } else {
          // Insert new
          const insertData: any = {
            organization_id: organizationId,
            budget_type: budgetType,
            budget_status: budget.status || '1',
            period_start: budget.periodStart,
            period_end: budget.periodEnd,
            value: budget.value,
            currency: budget.currency || 'USD',
            value_date: budget.valueDate
          }

          if (budgetType === 'recipient-country') {
            insertData.recipient_ref = budget.recipientCountry?.code
          } else if (budgetType === 'recipient-org') {
            insertData.recipient_ref = budget.recipientOrg?.ref
            insertData.recipient_narrative = budget.recipientOrg?.name
          } else if (budgetType === 'recipient-region') {
            insertData.recipient_ref = budget.recipientRegion?.code
            insertData.recipient_vocabulary = budget.recipientRegion?.vocabulary
            insertData.recipient_vocabulary_uri = budget.recipientRegion?.vocabularyUri
          }

          const { data: budgetRecord } = await supabase
            .from('organization_budgets')
            .insert(insertData)
            .select()
            .single()

          if (budgetRecord && budget.budgetLines && budget.budgetLines.length > 0) {
            const budgetLineData = budget.budgetLines.map((line: any) => ({
              budget_id: budgetRecord.id,
              ref: line.ref,
              value: line.value,
              currency: line.currency || 'USD',
              value_date: line.valueDate,
              narrative: line.narrative,
              language_code: 'en'
            }))

            await supabase.from('organization_budget_lines').insert(budgetLineData)
          }

          budgetsAdded++
        }
      }
    }

    // Process expenditures
    if (selectedByCategory['expenditures']) {
      const expendituresToImport = selectedFields
        .filter(f => f.category === 'expenditures')
        .map(f => f.itemData)
        .filter(Boolean)

      for (const expenditure of expendituresToImport) {
        const { data: existing } = await supabase
          .from('organization_expenditures')
          .select('id')
          .match({
            organization_id: organizationId,
            period_start: expenditure.periodStart,
            period_end: expenditure.periodEnd
          })
          .maybeSingle()

        if (existing) {
          await supabase
            .from('organization_expenditures')
            .update({
              value: expenditure.value,
              currency: expenditure.currency || 'USD',
              value_date: expenditure.valueDate
            })
            .eq('id', existing.id)

          // Delete and reinsert expense lines
          await supabase.from('organization_expense_lines').delete().eq('expenditure_id', existing.id)

          if (expenditure.expenseLines && expenditure.expenseLines.length > 0) {
            const expenseLineData = expenditure.expenseLines.map((line: any) => ({
              expenditure_id: existing.id,
              ref: line.ref,
              value: line.value,
              currency: line.currency || 'USD',
              value_date: line.valueDate,
              narrative: line.narrative,
              language_code: line.language || 'en'
            }))

            await supabase.from('organization_expense_lines').insert(expenseLineData)
          }

          expendituresUpdated++
        } else {
          const { data: expenditureRecord } = await supabase
            .from('organization_expenditures')
            .insert({
              organization_id: organizationId,
              period_start: expenditure.periodStart,
              period_end: expenditure.periodEnd,
              value: expenditure.value,
              currency: expenditure.currency || 'USD',
              value_date: expenditure.valueDate
            })
            .select()
            .single()

          if (expenditureRecord && expenditure.expenseLines && expenditure.expenseLines.length > 0) {
            const expenseLineData = expenditure.expenseLines.map((line: any) => ({
              expenditure_id: expenditureRecord.id,
              ref: line.ref,
              value: line.value,
              currency: line.currency || 'USD',
              value_date: line.valueDate,
              narrative: line.narrative,
              language_code: line.language || 'en'
            }))

            await supabase.from('organization_expense_lines').insert(expenseLineData)
          }

          expendituresAdded++
        }
      }
    }

    // Process documents
    if (selectedByCategory['documents']) {
      const documentsToImport = selectedFields
        .filter(f => f.category === 'documents')
        .map(f => f.itemData)
        .filter(Boolean)

      for (const doc of documentsToImport) {
        const { data: existing } = await supabase
          .from('organization_document_links')
          .select('id')
          .match({
            organization_id: organizationId,
            url: doc.url
          })
          .maybeSingle()

        if (existing) {
          await supabase
            .from('organization_document_links')
            .update({
              format: doc.format,
              document_date: doc.documentDate
            })
            .eq('id', existing.id)

          // Update related data (titles, descriptions, categories, etc.)
          await supabase.from('organization_document_titles').delete().eq('document_link_id', existing.id)
          await supabase.from('organization_document_descriptions').delete().eq('document_link_id', existing.id)
          await supabase.from('organization_document_categories').delete().eq('document_link_id', existing.id)
          await supabase.from('organization_document_languages').delete().eq('document_link_id', existing.id)
          await supabase.from('organization_document_recipient_countries').delete().eq('document_link_id', existing.id)

          // Reinsert related data
          if (doc.titles && doc.titles.length > 0) {
            const titleData = doc.titles.map((title: any) => ({
              document_link_id: existing.id,
              narrative: title.narrative,
              language_code: title.language || 'en'
            }))
            await supabase.from('organization_document_titles').insert(titleData)
          }

          if (doc.descriptions && doc.descriptions.length > 0) {
            const descriptionData = doc.descriptions.map((desc: any) => ({
              document_link_id: existing.id,
              narrative: desc.narrative,
              language_code: desc.language || 'en'
            }))
            await supabase.from('organization_document_descriptions').insert(descriptionData)
          }

          if (doc.categories && doc.categories.length > 0) {
            const categoryData = doc.categories.map((category: string) => ({
              document_link_id: existing.id,
              category_code: category
            }))
            await supabase.from('organization_document_categories').insert(categoryData)
          }

          if (doc.languages && doc.languages.length > 0) {
            const languageData = doc.languages.map((language: string) => ({
              document_link_id: existing.id,
              language_code: language
            }))
            await supabase.from('organization_document_languages').insert(languageData)
          }

          if (doc.recipientCountries && doc.recipientCountries.length > 0) {
            const countryData = doc.recipientCountries.map((country: any) => ({
              document_link_id: existing.id,
              country_code: country.code,
              narrative: country.narrative,
              language_code: country.language || 'en'
            }))
            await supabase.from('organization_document_recipient_countries').insert(countryData)
          }

          documentsUpdated++
        } else {
          const { data: documentRecord } = await supabase
            .from('organization_document_links')
            .insert({
              organization_id: organizationId,
              url: doc.url,
              format: doc.format,
              document_date: doc.documentDate
            })
            .select()
            .single()

          if (documentRecord) {
            // Insert related data
            if (doc.titles && doc.titles.length > 0) {
              const titleData = doc.titles.map((title: any) => ({
                document_link_id: documentRecord.id,
                narrative: title.narrative,
                language_code: title.language || 'en'
              }))
              await supabase.from('organization_document_titles').insert(titleData)
            }

            if (doc.descriptions && doc.descriptions.length > 0) {
              const descriptionData = doc.descriptions.map((desc: any) => ({
                document_link_id: documentRecord.id,
                narrative: desc.narrative,
                language_code: desc.language || 'en'
              }))
              await supabase.from('organization_document_descriptions').insert(descriptionData)
            }

            if (doc.categories && doc.categories.length > 0) {
              const categoryData = doc.categories.map((category: string) => ({
                document_link_id: documentRecord.id,
                category_code: category
              }))
              await supabase.from('organization_document_categories').insert(categoryData)
            }

            if (doc.languages && doc.languages.length > 0) {
              const languageData = doc.languages.map((language: string) => ({
                document_link_id: documentRecord.id,
                language_code: language
              }))
              await supabase.from('organization_document_languages').insert(languageData)
            }

            if (doc.recipientCountries && doc.recipientCountries.length > 0) {
              const countryData = doc.recipientCountries.map((country: any) => ({
                document_link_id: documentRecord.id,
                country_code: country.code,
                narrative: country.narrative,
                language_code: country.language || 'en'
              }))
              await supabase.from('organization_document_recipient_countries').insert(countryData)
            }

            documentsAdded++
          }
        }
      }
    }

    const response: ImportResponse = {
      success: errors.length === 0,
      updated_fields: updatedFields,
      budgets_added: budgetsAdded,
      budgets_updated: budgetsUpdated,
      documents_added: documentsAdded,
      documents_updated: documentsUpdated,
      expenditures_added: expendituresAdded,
      expenditures_updated: expendituresUpdated
    }

    if (errors.length > 0) {
      response.errors = errors
    }

    if (warnings.length > 0) {
      response.warnings = warnings
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[IATI Org Import] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        updated_fields: [],
        budgets_added: 0,
        budgets_updated: 0,
        documents_added: 0,
        documents_updated: 0,
        expenditures_added: 0,
        expenditures_updated: 0
      },
      { status: 500 }
    )
  }
}





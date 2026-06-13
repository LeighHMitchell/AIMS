/**
 * Glossary of terms and phrases used across the AIMS application.
 * Each term has a `simple` plain-language definition and a `detailed`
 * definition with fuller technical and IATI / OECD DAC context.
 *
 * Formatting: codelist values, identifiers, and element names in the
 * detailed definitions are wrapped in backticks; the Glossary page
 * renders them as inline code (monospace on a grey background).
 *
 * This file is also the seed source for the glossary_terms table:
 * regenerate the migration seed with scripts/generate-glossary-seed.ts
 * after editing.
 */

export interface GlossaryTerm {
  id: string
  term: string
  category: string
  simple: string
  detailed: string
}

export const GLOSSARY_CATEGORIES = [
  'Activities',
  'Finance & Transactions',
  'Organisations & People',
  'Sectors & Classifications',
  'Locations & Geography',
  'Results & Monitoring',
  'IATI Standard',
  'Data Quality & Tools',
  'System & Access',
  'Analysis & Effectiveness',
] as const

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ─── Activities ───
  {
    id: 'activity',
    term: 'Activity',
    category: 'Activities',
    simple: 'A single aid project or programme, the basic building block of everything in the system.',
    detailed:
      'An activity is the core reporting unit of the IATI Standard, represented in published data by the `iati-activity` element. The standard deliberately leaves the unit flexible: an activity can be a project, a programme, a grant agreement, a tranche of budget support, or any other discrete unit of development or humanitarian cooperation that the reporting organisation manages as one thing. Every other kind of data in this system hangs off an activity record: titles and descriptions, activity dates, participating organisations, budgets, transactions, sector and policy classifications, locations, documents, and results. Because of this, the completeness of activity records determines the quality of everything downstream. Dashboards, country analytics, IATI exports, and validation workflows are all aggregations or transformations of activity data, so a gap at activity level (a missing sector, an unlinked funder) becomes a gap in every report built on top of it.',
  },
  {
    id: 'iati-identifier',
    term: 'IATI Identifier',
    category: 'Activities',
    simple: 'The globally unique reference code for an activity, like a serial number that no other project shares.',
    detailed:
      'The IATI identifier is the globally unique reference for an activity, published in the `iati-identifier` element. It is constructed by joining the reporting organisation\'s own identifier to an activity code of the publisher\'s choosing, for example `XM-DAC-41114-PROJECT123`, where `XM-DAC-41114` identifies the publisher (in this case UNDP) and `PROJECT123` is its internal reference. Because the publisher prefix is itself globally unique, the combined identifier is guaranteed to be unique across the entire IATI ecosystem without any central register of project codes. The identifier is also meant to be permanent: once published it should never change, even if the project is renamed or restructured, because other publishers and systems use it to refer to the activity. This system relies on the IATI identifier to match incoming records against existing ones during imports, to link related activities reported by different organisations, and to prevent the same project from being created twice.',
  },
  {
    id: 'activity-status',
    term: 'Activity Status',
    category: 'Activities',
    simple: 'Where an activity is in its life: being planned, running, finished, or cancelled.',
    detailed:
      'Activity status records the lifecycle stage of an activity using the IATI ActivityStatus codelist: `1` Pipeline/Identification (the activity is being scoped or appraised and is not yet certain to proceed), `2` Implementation (the activity is under way), `3` Finalisation (delivery is complete but financial closure, evaluation, or final reporting is still in progress), `4` Closed (everything including financial closure is finished), `5` Cancelled (the activity was abandoned before or during delivery), and `6` Suspended (delivery has been paused with the intention of resuming). The status should be reviewed and updated as the activity moves through its life, since stale statuses are one of the most common data-quality problems in aid information systems. Status drives a great deal of behaviour in this system: pipeline activities are typically excluded from spending charts because no money has flowed yet, forward-planning views lean on pipeline and implementation records, and completeness checks apply different expectations to closed activities than to active ones.',
  },
  {
    id: 'planned-dates',
    term: 'Planned Start / End Date',
    category: 'Activities',
    simple: 'The dates an activity is expected to begin and finish.',
    detailed:
      'Planned dates are published through the IATI `activity-date` element using type `1` (planned start) and type `3` (planned end). They capture the schedule as it was designed: when the activity is expected to begin operations and when it is expected to finish. Planned dates are set during design and appraisal and often differ from what actually happens, which is exactly why the standard keeps planned and actual dates as separate fields rather than overwriting one with the other. Preserving the original plan makes slippage visible: an activity whose actual start is a year after its planned start tells a story about delays in approval, procurement, or mobilisation. In this system planned dates power timeline charts, forward-looking resource projections, and the spreading of budgets across years before actual figures exist. The IATI standard expects a planned or actual start date on every activity, and data-quality checks here flag activities that have neither.',
  },
  {
    id: 'actual-dates',
    term: 'Actual Start / End Date',
    category: 'Activities',
    simple: 'The dates an activity really began and really finished.',
    detailed:
      'Actual dates are published through the IATI `activity-date` element using type `2` (actual start) and type `4` (actual end). The actual start is the date the activity genuinely commenced, which organisations usually anchor to a concrete event such as the first disbursement, the signing of the implementation agreement, or the start of field operations. The actual end marks real completion of delivery. The standard expects the actual end date to be reported only once the activity has genuinely finished, so an open-ended activity carries a planned end date but no actual one. When both planned and actual dates exist, this system prefers actual dates for retrospective reporting (what happened and when) and planned dates for forward-looking views (what is scheduled). Comparing the two pairs is itself a useful analysis: systematic gaps between planned and actual dates across a portfolio reveal where the delivery pipeline tends to stall.',
  },
  {
    id: 'reporting-organisation',
    term: 'Reporting Organisation',
    category: 'Activities',
    simple: 'The organisation that owns and publishes the activity record, the one telling the story.',
    detailed:
      'The reporting organisation, published in the IATI `reporting-org` element, is the organisation responsible for the activity record itself: the publisher whose account of the activity this is. It is a statement about data ownership, not about money, so the reporting organisation is not necessarily the funder or the implementer of the work. One real-world project frequently appears as several activity records, each told from a different position in the funding chain: the back donor reports its grant to a UN agency, the UN agency reports its programme, and the implementing NGO reports its delivery contract, each as the reporting organisation of its own record. In this system the reporting organisation is the owning organisation of the activity, which controls who may edit it: write access flows from being a super user, belonging to the reporting organisation, having created the record, or being a named contributor. The `reporting-org` element also carries the organisation\'s IATI identifier and type code so the publisher can be recognised unambiguously across systems.',
  },
  {
    id: 'publication-status',
    term: 'Publication Status',
    category: 'Activities',
    simple: 'Whether an activity is still a private draft or visible to everyone in the system.',
    detailed:
      'Publication status is this system\'s distinction between working data and public data. Activities start life as drafts, visible only to their owning organisation and any invited contributors, which gives data-entry staff room to assemble a record over several sessions without exposing half-finished information. Once published, the activity appears in public lists, search, dashboards, organisation profiles, and country analytics. The distinction matters most for aggregate figures: the canonical financial calculations in this system intentionally count only published, non-deleted activities, so a draft with a large test transaction can never distort a national total. Publication status is separate from two other states it is often confused with: activity status (where the project is in its real-world lifecycle) and validation status (whether the data steward has approved the record). An activity can be published while still pending validation, and a closed activity remains published. Unpublishing returns a record to draft visibility without deleting anything.',
  },
  {
    id: 'validation-status',
    term: 'Validation Status',
    category: 'Activities',
    simple: 'Whether the government (or another authority) has checked and approved the activity data.',
    detailed:
      'Validation is a quality-assurance stamp applied by the data steward of the system, typically the government ministry responsible for aid coordination. This system uses a three-state model: Pending Validation (the record awaits review), Validated (the steward has confirmed the activity is genuine, correctly described, and appropriately classified), and Rejected (the steward found problems that the reporting organisation needs to address before resubmitting). Validation exists because an aid information system is only as credible as its contents: governments using the data for budget planning and donor coordination need confidence that records reflect real activities and that financial figures are plausible. Validation is deliberately separate from publication. A record can be visible to all users while still awaiting review, and the validation state is displayed so consumers of the data can judge how much scrutiny it has received. Rejection is a request for correction, not a deletion: the record stays in the system with feedback for the reporting organisation to act on.',
  },
  {
    id: 'contributor',
    term: 'Contributor',
    category: 'Activities',
    simple: 'A person or organisation invited to help edit an activity they do not own.',
    detailed:
      'Contributors are users or organisations granted edit access to specific activities without belonging to the reporting organisation that owns them. The mechanism exists because real aid reporting is collaborative: a donor may own the activity record while the implementing NGO holds the ground truth about locations, results, and delivery dates, or a government focal point may need to correct classifications on a partner\'s record. Rather than passing spreadsheets back and forth, the owner invites the other party as a contributor and both work on the same record. Contributor access is scoped per activity, so being invited to one project grants nothing on the rest of the owner\'s portfolio. In this system\'s permission model, write access to an activity flows from any one of four relationships: being a super user, belonging to the reporting organisation, being the creator of the record, or being a named contributor. The same rules are enforced in the interface, in the API routes, and in the database\'s row-level security, so contributor permissions hold even against direct API calls.',
  },
  {
    id: 'related-activity',
    term: 'Related Activity',
    category: 'Activities',
    simple: 'A link between two activities that belong together, like a parent programme and its child projects.',
    detailed:
      'The IATI `related-activity` element records a typed link from one activity to another using the RelatedActivityType codelist: `1` Parent (the linked activity is the programme this one sits under), `2` Child (the linked activity is a component of this one), `3` Sibling (both activities share the same parent), `4` Co-funded (the linked activity is the same piece of work funded jointly by more than one organisation), and `5` Third party (a related activity reported by an organisation outside the delivery chain). Each link carries the IATI identifier of the target activity, which is one of the reasons stable identifiers matter so much. Related-activity links let analysts assemble the full structure of a programme from records published separately, trace funding as it cascades from a framework programme into sub-projects, and follow co-financing arrangements across publishers. They are also the main defence against double counting: when a parent programme and its children all report the same money, the links make the overlap detectable so aggregations can count one level only.',
  },
  {
    id: 'activity-hierarchy',
    term: 'Activity Hierarchy',
    category: 'Activities',
    simple: 'A number showing the level of an activity: a big programme at the top or a small component underneath.',
    detailed:
      'The IATI `hierarchy` attribute is an integer on the activity that declares its level within the publisher\'s own programme structure: `1` for a standalone activity or top-level programme, `2` for a sub-activity beneath it, and larger numbers for deeper nesting where a publisher uses it. Hierarchy works hand in hand with `related-activity` links: the attribute says what level a record sits at, while the links say which specific records sit above and below it. The standard\'s guidance is that financial values should not be duplicated across levels, but in practice some publishers report budgets at programme level and transactions at project level, or repeat totals at both. This is why aggregation logic must choose a single hierarchy level when summing across a publisher\'s portfolio: adding level `1` and level `2` records together risks counting the same money twice. Hierarchy also helps presentation, letting interfaces show a programme with its components grouped beneath it rather than as an undifferentiated list.',
  },
  {
    id: 'activity-editor',
    term: 'Activity Editor',
    category: 'Activities',
    simple: 'The screen where you fill in all the details of an activity, organised into tabs.',
    detailed:
      'The Activity Editor is the main data-entry workspace of the system: a tabbed interface covering general information, sectors, locations, participating organisations, finances (budgets, transactions, planned disbursements), results, documents, contacts, and the other sections of an activity record. The tab structure deliberately mirrors the IATI activity standard, so completing the editor section by section effectively builds a standards-compliant record without the user needing to know any XML. Most fields autosave as you work, with a visible indicator showing each save in flight and confirming when it lands, so a lost connection or closed laptop costs keystrokes rather than a session\'s work. The editor enforces the system\'s permission model (only the reporting organisation, the creator, contributors, and super users can edit) and surfaces guidance inline: required IATI fields are marked, dropdowns are populated from the official codelists, and completeness indicators show which sections still need attention before the record is a strong publication candidate.',
  },

  // ─── Finance & Transactions ───
  {
    id: 'transaction',
    term: 'Transaction',
    category: 'Finance & Transactions',
    simple: 'A single recorded movement of money in or out of an activity, with a date, an amount, and who paid whom.',
    detailed:
      'Transactions are the financial backbone of IATI data: each one records a single flow of resources with a transaction type, a value, a currency, a transaction date, and ideally the provider and receiver organisations on each end of the flow. The `transaction-type` code distinguishes the different kinds of flow, including `1` Incoming Funds, `2` Outgoing Commitment, `3` Disbursement, `4` Expenditure, and `11` Incoming Commitment, and the type determines how each transaction should be counted: commitments measure promises while disbursements and expenditures measure delivery, so adding them together produces meaningless totals. Transactions can also carry their own classifications (sector, aid type, finance type, recipient country) when a single activity\'s flows need to be split more precisely than activity-level percentages allow. In this system every transaction additionally stores a USD value converted at the exchange rate for its value date, which is what makes flows reported in different currencies comparable, and the canonical aggregation rules (published activities only, internal transfers excluded, USD values) are applied consistently across all charts.',
  },
  {
    id: 'commitment',
    term: 'Commitment',
    category: 'Finance & Transactions',
    simple: 'A firm, written promise to provide a specific amount of money.',
    detailed:
      'A commitment, IATI transaction type `2` (Outgoing Commitment), follows the OECD DAC definition: a firm obligation, expressed in writing and backed by the necessary funds, undertaken by a donor or provider to supply specified assistance to a recipient. The key words are firm and written. A commitment is not an intention, a pledge at a conference, or a line in a planning document; it is a binding obligation, typically created by signing a grant agreement or financing contract, and the funds behind it are secured. Commitments answer the question "how much has been promised?", while disbursements answer "how much has actually moved?", and the gap between the two is one of the most informative measures in aid analysis: large unspent commitments signal delivery bottlenecks, while disbursements without prior commitments suggest reporting gaps. Commitments are also where new money enters portfolio analysis, since the year of commitment shows when a donor decided to fund something, regardless of how many years the disbursements then take.',
  },
  {
    id: 'disbursement',
    term: 'Disbursement',
    category: 'Finance & Transactions',
    simple: 'Money actually paid out from one organisation to another, for example from a donor to an NGO.',
    detailed:
      'A disbursement, IATI transaction type `3`, records outgoing funds that are placed at the disposal of a recipient government or organisation: the actual transfer of resources from the reporting organisation to the next link in the delivery chain. This follows the OECD DAC concept of disbursement as the release of funds to a recipient, the point at which the money genuinely changes hands rather than merely being promised. Disbursements are the standard measure of "actual spend" in most of this system\'s charts because they capture real resource transfers on real dates, making them suitable for year-by-year analysis of how much aid flowed. The crucial distinction is with expenditure: a disbursement moves money between organisations, while expenditure is money spent directly on goods, services, and salaries. An intermediary agency disburses onward to its implementing partners; the implementer at the end of the chain records expenditure. Counting both for the same underlying money double counts it, which is why aggregation logic must treat the two types deliberately rather than summing every outgoing transaction.',
  },
  {
    id: 'expenditure',
    term: 'Expenditure',
    category: 'Finance & Transactions',
    simple: 'Money spent directly on goods, services, or salaries rather than passed to another organisation.',
    detailed:
      'Expenditure, IATI transaction type `4`, records outgoing funds that are spent directly on goods and services for the activity: paying staff salaries, purchasing supplies and equipment, running vehicles, hiring venues, settling contractor invoices. It is the point in the delivery chain where money stops being transferred between organisations and is actually consumed in producing the activity\'s outputs. The position in the chain determines which type an organisation reports: a back donor disburses to a UN agency, the agency disburses onward to an NGO, and the NGO records expenditure as it delivers, with each organisation reporting the flows it directly controls. Expenditure is therefore the closest financial measure to "what delivery actually cost", and comparing expenditure against the disbursements received can reveal pipeline lags inside implementing organisations. As with disbursements, the double-counting caution applies: the same underlying money appears as a disbursement in the funder\'s record and as expenditure in the implementer\'s, so portfolio totals must choose a consistent measurement point rather than adding every transaction in sight.',
  },
  {
    id: 'incoming-funds',
    term: 'Incoming Funds',
    category: 'Finance & Transactions',
    simple: 'Money an organisation receives from a funder for an activity.',
    detailed:
      'Incoming funds, IATI transaction type `1`, record funds received for use on the activity, reported from the recipient\'s side of the transfer. They are the mirror image of the funder\'s disbursement: when a donor disburses to an implementing agency, the donor reports a type `3` transaction and the agency reports a type `1`, both describing the same movement of money from their respective vantage points. Incoming funds show how an activity is financed in practice, including the timing and size of each tranche received, which makes them valuable for analysing the predictability of funding: irregular or delayed inflows are a well-documented cause of delivery disruption. The mirroring is also exactly why analytics must be careful. Because one real transfer can legitimately appear in two publishers\' data, aggregations across organisations must pick a single side (this system\'s canonical rules are provider-centric, counting outgoing flows) or risk inflating totals. Within a single organisation\'s own portfolio view, however, incoming funds are the right measure of resources received.',
  },
  {
    id: 'incoming-commitment',
    term: 'Incoming Commitment',
    category: 'Finance & Transactions',
    simple: 'A funder\'s firm promise of money, recorded from the receiver\'s point of view.',
    detailed:
      'An incoming commitment, IATI transaction type `11`, records a firm, written obligation from a donor or provider to supply a specified amount of funds to this activity, reported by the recipient rather than the funder. It mirrors the funder\'s outgoing commitment (type `2`) in the same way that incoming funds mirror disbursements: the same signed agreement appears in the donor\'s data as a promise made and in the recipient\'s data as a promise received. Incoming commitments matter because they describe an activity\'s secured budget before any cash has flowed. An implementing organisation that has signed agreements covering its full project budget is in a very different position from one delivering against verbal assurances, and the type `11` transactions make that distinction visible in the data. They also let recipients publish a complete financial picture of their activities (what was promised, what has arrived, what has been spent) without waiting on their funders\' own publications. The usual mirroring caution applies when aggregating across publishers, since the same obligation can appear on both sides.',
  },
  {
    id: 'planned-disbursement',
    term: 'Planned Disbursement',
    category: 'Finance & Transactions',
    simple: 'A schedule of when future payments are expected to happen.',
    detailed:
      'The IATI `planned-disbursement` element publishes the expected schedule of future transfers for an activity: each entry has a period start and end, a value, and optionally the provider and receiver organisations involved. Where the budget element describes the planned resource envelope of the activity, planned disbursements describe expected cash flow, the rhythm at which money is actually scheduled to move, which makes them the IATI mechanism for forward visibility of funding. For partner governments this is among the most operationally valuable data in the standard: finance ministries preparing annual budgets need to know not just that a donor has committed funds but when those funds are expected to arrive, and aid-effectiveness commitments on predictability are measured against exactly this kind of forward schedule. Planned disbursements are projections, not records of fact, so this system charts them separately from actual transactions and uses them for forward-looking views: comparing planned against actual disbursements per period then shows how reliable each organisation\'s forecasts turn out to be.',
  },
  {
    id: 'activity-budget',
    term: 'Activity Budget',
    category: 'Finance & Transactions',
    simple: 'The total amount of money set aside for an activity, broken into time periods.',
    detailed:
      'The IATI `budget` element captures the planned resource envelope of an activity, divided into time periods that the standard requires to be no longer than one year each, with quarterly or annual breakdowns the common practice. Each budget entry carries a type from the BudgetType codelist, `1` Original (the budget as first agreed) or `2` Revised (a subsequent update), and a status from the BudgetStatus codelist, `1` Indicative (a non-binding estimate) or `2` Committed (a binding allocation). Keeping original and revised budgets side by side preserves the history of how an activity\'s envelope changed over its life, which is itself useful evidence about scope changes and cost pressures. Budgets serve a different purpose from transactions: they describe intention and allocation, while transactions describe actual movement, and budget-versus-actual comparison is the basic tool for tracking whether delivery is keeping pace with plan. In this system budget periods also feed forward-looking views and the financial-year bucketing used in workspace summaries, with amounts split proportionally where a budget period straddles a year boundary.',
  },
  {
    id: 'funding-envelope',
    term: 'Funding Envelope',
    category: 'Finance & Transactions',
    simple: 'An organisation\'s overall forward plan of how much it expects to provide to a country, by year.',
    detailed:
      'A funding envelope records a development partner\'s total planned funding to the host country per period, sitting above any individual activity. It is modelled on the IATI organisation standard\'s `recipient-country-budget` element, which is published in an organisation file rather than an activity file precisely because it describes the organisation\'s overall country programme rather than any single project. In this system each envelope row has explicit period start and end dates, a recipient country (defaulting to the host country), a value, and a status of indicative or committed, matching the IATI BudgetStatus distinction between non-binding forecasts and firm allocations. Envelopes answer a question activity data cannot: what is this partner\'s overall financial intention here over the coming years, including resources not yet attached to designed projects? That is the figure national planners need for medium-term fiscal frameworks and aid projections. Comparing envelopes against the activity-level budgets and transactions that materialise underneath them also reveals how much of a partner\'s stated country programme actually converts into concrete, reported activities.',
  },
  {
    id: 'usd-value',
    term: 'USD Value',
    category: 'Finance & Transactions',
    simple: 'Every amount converted into US dollars so different currencies can be added together.',
    detailed:
      'Transactions, budgets, and planned disbursements arrive in this system in many currencies, since IATI lets every publisher report in whatever currency it operates in: one activity\'s flows may be in euros, another\'s in yen, a third\'s in the local currency. Aggregating across them requires a common denominator, so the system converts every monetary value to US dollars at the point of saving and stores the USD figure alongside the original amount and currency. The conversion uses the exchange rate for each value\'s own date rather than today\'s rate, which keeps historical totals stable: a 2019 disbursement is worth what it was worth in 2019, and its USD value does not drift as exchange rates move. All cross-activity aggregations, dashboards, donor league tables, and charts read the stored USD value rather than converting on the fly, which guarantees that every view of the same data reconciles to the same totals. The original currency and amount are always preserved, so nothing is lost in conversion and per-currency analysis remains possible. Missing USD values are treated as a data gap and surfaced for repair in the Data Clinic.',
  },
  {
    id: 'exchange-rate',
    term: 'Exchange Rate',
    category: 'Finance & Transactions',
    simple: 'The rate used to translate an amount from its original currency into US dollars.',
    detailed:
      'Every currency conversion in the system is anchored to a historical exchange rate: the rate prevailing on the value date of the transaction or budget line being converted, fetched from a rates source and cached so repeated conversions of the same currency and date do not trigger repeated lookups. Using the rate at the time of the flow, rather than the current rate, is a deliberate methodological choice shared with OECD DAC statistical practice: it reflects what the money was actually worth when it moved, and it makes historical figures stable, so a report generated today and one generated next year show the same USD totals for past years. The alternative (converting everything at today\'s rate) would silently restate history every time markets moved. Rates are stored with the converted values, which makes conversions auditable: any USD figure can be traced back to its original amount, currency, date, and the rate applied. Where a rate cannot be found for a given currency and date, the value is flagged rather than silently skipped, so missing conversions surface as a fixable data gap instead of quietly deflating totals.',
  },
  {
    id: 'default-currency',
    term: 'Default Currency',
    category: 'Finance & Transactions',
    simple: 'The currency an activity normally reports in, used when an individual amount does not state one.',
    detailed:
      'The IATI `default-currency` attribute sits on the `iati-activity` element and declares the currency that applies to every monetary value within the activity unless a specific value overrides it. The standard requires that every value be interpretable in some currency, so either the activity declares a default or each individual `value` element carries its own `currency` attribute; most publishers set a default matching their accounting currency and override it only for the occasional flow in another denomination. The mechanism keeps published files compact (no need to repeat `USD` on every value) while staying unambiguous. During import this system applies the same resolution order the standard defines: a value\'s own currency attribute wins if present, otherwise the activity default applies, and the resolved currency is what feeds USD conversion. Files that omit both are flagged as a data-quality problem, since amounts without a currency are uninterpretable. Within the editor, setting the activity\'s default currency correctly up front saves repeated entry and prevents the classic error of mixed-currency transactions all being silently read as one denomination.',
  },
  {
    id: 'finance-type',
    term: 'Finance Type',
    category: 'Finance & Transactions',
    simple: 'Whether money is a grant (which never has to be repaid), a loan (which does), or another financial instrument.',
    detailed:
      'Finance type classifies the financial instrument behind a flow, using the IATI FinanceType codelist, which is based on the OECD DAC classification of financial instruments used in Creditor Reporting System statistics. The headline distinction is between grants and debt: `110` Standard grant (a transfer with no repayment obligation), `421` Standard loan (a transfer that must be repaid, concessional or not), and `422` Reimbursable grant (a grant expected to be repaid under certain conditions), alongside codes for bonds, guarantees, equity investments, and debt-relief instruments. The classification matters enormously for recipients: a million dollars of grant and a million dollars of loan look identical in disbursement charts but have opposite effects on public debt, and the DAC\'s grant-equivalent methodology for measuring ODA exists precisely because instruments differ in their real value to the recipient. Finance type also signals concessionality when read alongside loan terms. In this system finance type can be set as an activity default and overridden per transaction, and it feeds debt-relevant analysis and the classification charts in Country Analytics.',
  },
  {
    id: 'flow-type',
    term: 'Flow Type',
    category: 'Finance & Transactions',
    simple: 'The broad category of the money: official aid, other government flows, or private funds.',
    detailed:
      'Flow type classifies a resource flow by its origin and character, using the IATI FlowType codelist, which mirrors the OECD DAC\'s top-level reporting categories. The principal codes are `10` ODA (Official Development Assistance: flows from official agencies that are concessional in character and have the economic development and welfare of developing countries as their main objective), `20` OOF (Other Official Flows: official-sector flows that do not meet the ODA test, such as export credits or transactions at market terms), `30` Private Development Finance (flows from private organisations such as foundations and NGOs for development purposes), and further codes covering private market flows and non-flow items. The distinction matters because ODA is the measure against which international aid commitments, like the long-standing 0.7% of gross national income target, are tracked, and because the different flow types behave differently: ODA is programmable and concessional, OOF and private flows are not. The Country Analytics flow-type chart uses this field to show how much of total funding to the country qualifies as ODA versus other kinds of resource.',
  },
  {
    id: 'aid-type',
    term: 'Aid Type',
    category: 'Finance & Transactions',
    simple: 'The form aid takes: money into the national budget, support to a fund, project aid, or technical experts.',
    detailed:
      'Aid type classifies the modality through which assistance is delivered, using the IATI AidType codelist drawn from the OECD DAC\'s typology. The major categories are budget support (`A01` General budget support, paid into the recipient treasury with no earmarking, and `A02` Sector budget support, earmarked to a sector), core and pooled contributions (`B01` core support to NGOs, `B02` core contributions to multilateral institutions, `B04` basket funds and pooled funding), project-type interventions (`C01`, the classic standalone project), experts and technical assistance (`D01` donor-country personnel, `D02` other technical assistance), scholarships, debt relief, and administrative costs. Modality is one of the most policy-relevant classifications in aid data because it determines how controllable and visible aid is to the partner government: budget support flows through national public financial management systems and appears in the national budget, while project aid often runs through parallel structures the government cannot see or steer. Aid-effectiveness commitments explicitly encourage greater use of country systems, so the aid-type mix of a portfolio, shown in the Country Analytics modality chart, is a direct measure against those commitments.',
  },
  {
    id: 'tied-status',
    term: 'Tied Status',
    category: 'Finance & Transactions',
    simple: 'Whether aid money must be spent on suppliers from the donor country or can be spent anywhere.',
    detailed:
      'Tied status records procurement conditions attached to aid, using the IATI TiedStatus codelist: `3` Partially tied (procurement is restricted to the donor country plus a limited group of others), `4` Tied (goods and services must be procured from the donor country), and `5` Untied (the recipient may procure from any country). The OECD DAC definitions sit behind these codes, and the DAC has tracked untying for decades because tying has well-documented costs: restricting procurement to donor-country suppliers removes competition, and DAC-cited research estimates this raises the cost of aid-funded goods and services by roughly 15 to 30 percent, effectively shrinking the real value of the aid. Tying can also skew what gets funded toward what the donor\'s industries supply. A DAC Recommendation has progressively committed members to untying aid to the least developed and other low-income countries, so the untied share of a portfolio is a standing accountability measure. The tied-status chart in Country Analytics shows exactly this mix, including how much of the portfolio fails to report the field at all.',
  },
  {
    id: 'provider-organisation',
    term: 'Provider Organisation',
    category: 'Finance & Transactions',
    simple: 'The organisation the money in a transaction comes from.',
    detailed:
      'The `provider-org` element on an IATI transaction names the organisation from which the funds originated, complete with its organisation identifier where known, and on incoming transactions it can also carry a `provider-activity-id` pointing at the specific activity in the provider\'s own published data that the money came from, allowing flows to be traced across publishers\' datasets link by link. Provider information is the foundation of funding attribution: knowing that a disbursement happened is far less useful than knowing whose money it was. In this system donor attribution is provider-centric by design: charts credit each flow to its provider organisation, fall back to the reporting organisation for outgoing transaction types (commitments, disbursements, expenditures) when no provider is named, since the reporter of an outgoing flow is ordinarily its source, and place anything still unattributable into an explicit "Unattributed / Unknown partner" bucket rather than silently dropping it. Receiver data is deliberately never used for donor attribution. Missing provider links are flagged in the Data Clinic because they directly erode the accuracy of every donor league table built on the data.',
  },
  {
    id: 'receiver-organisation',
    term: 'Receiver Organisation',
    category: 'Finance & Transactions',
    simple: 'The organisation the money in a transaction goes to.',
    detailed:
      'The `receiver-org` element on an IATI transaction names the organisation receiving the funds, with its organisation identifier where known, and on outgoing transactions it can carry a `receiver-activity-id` pointing to the activity in the receiver\'s own IATI data that the money funds, the mirror of the provider-side link. Together, provider and receiver turn a list of transactions into a network: each flow is an edge from one organisation to another, and assembling the edges produces the funding-flow diagrams (such as the Sankey charts in this system) that trace money from original funders through intermediary agencies to the implementers who finally spend it. Receiver data answers delivery-chain questions that provider data cannot: how much funding flows through international intermediaries versus directly to national organisations (a core localisation measure), which implementers depend heavily on a single funder, and where chains are so long that transaction costs accumulate at every hop. Naming receivers precisely, with identifiers rather than free-text names, is what makes these analyses reliable, so unlinked receiver names are surfaced as a data gap.',
  },
  {
    id: 'internal-transfer',
    term: 'Internal Transfer',
    category: 'Finance & Transactions',
    simple: 'Money moved between parts of the same organisation, which should not be counted as new funding.',
    detailed:
      'An internal transfer is a transaction whose provider and receiver are the same organisation: headquarters funding its own country office, one department allocating budget to another, or an agency moving money between its own activities. These movements are real and worth recording, since they explain how resources travel inside large organisations, but they are not new funding entering the system, and counting them alongside genuine transfers would inflate totals: a dollar that moves from a donor to an agency headquarters, then from headquarters to the country office, then from the country office to a project would be counted three times instead of once. This system\'s canonical financial aggregation therefore excludes transactions where the provider and receiver resolve to the same organisation, so dashboards and country totals reflect genuine resource flows between distinct actors. The exclusion depends on organisations being properly linked: if a headquarters and its country office exist as separate unlinked organisation records, their transfers will not be recognised as internal, which is one more reason organisation de-duplication and identifier hygiene matter to financial accuracy.',
  },
  {
    id: 'disbursement-channel',
    term: 'Disbursement Channel',
    category: 'Finance & Transactions',
    simple: 'The route money takes: through the government\'s own systems or around them.',
    detailed:
      'The IATI DisbursementChannel codelist describes the route by which funds reach their destination: `1` money disbursed through the central Ministry of Finance or Treasury (the flow passes through the government\'s own public financial management systems and is therefore visible in, and managed alongside, the national budget), `2` money disbursed directly to the implementing institution through a separate bank account (the common arrangement for project aid, bypassing the treasury), `3` aid in kind delivered via third-party agencies (the donor purchases goods or services and a separate organisation distributes them), and `4` aid in kind managed by the donor itself. The channel field operationalises one of the central concerns of the aid-effectiveness agenda: use of country systems. Aid that flows through the treasury strengthens national institutions, appears in the budget the legislature scrutinises, and reduces the fragmentation of parallel project units; aid routed around the treasury may be faster or safer in weak-governance contexts but builds nothing and is invisible to national planning. Channel data therefore feeds "use of country systems" indicators in aid-effectiveness monitoring, and its absence is itself a meaningful reporting gap.',
  },
  // ─── Organisations & People ───
  {
    id: 'organisation',
    term: 'Organisation',
    category: 'Organisations & People',
    simple: 'Any body involved in aid: a donor, government ministry, NGO, UN agency, or company.',
    detailed:
      'Organisations are first-class records in the system covering every kind of body that plays a part in development cooperation: bilateral donor agencies, partner-government ministries, multilateral institutions, international and national NGOs, foundations, academic institutions, and private companies. Each organisation exists exactly once, with a profile holding its names and acronym, IATI organisation identifier, type classification, contacts, logo, and descriptive information, and that single record is then referenced everywhere the organisation appears: as the reporter of activities, as a participating organisation in a given role, and as the provider or receiver of transactions. This one-record-many-references design is what makes cross-cutting analysis possible. A question like "show me everything UNDP funds in this country" is only answerable if every reference to UNDP points at the same record; the moment the same agency exists three times under slightly different names, its portfolio fragments and every total involving it becomes unreliable. That is why organisation de-duplication, identifier hygiene, and the linking of free-text names to real records are treated as core data-quality work in this system rather than cosmetic tidying.',
  },
  {
    id: 'organisation-type',
    term: 'Organisation Type',
    category: 'Organisations & People',
    simple: 'The kind of organisation it is: government, NGO, multilateral, private sector, and so on.',
    detailed:
      'Organisation type classifies what kind of body an organisation is, using the IATI OrganisationType codelist: `10` Government, `11` Local Government, `15` Other Public Sector, `21` International NGO, `22` National NGO, `23` Regional NGO, `24` Partner Country based NGO, `30` Public Private Partnership, `40` Multilateral, `60` Foundation, `70` Private Sector, `80` Academic, Training and Research, and `90` Other. The type is recorded once on the organisation record and inherited by every analysis that touches it. Typing matters because many of the most policy-relevant questions in aid are really questions about organisation types: what share of funding is implemented by national organisations versus international ones (the localisation agenda, with explicit international commitments attached), how much flows through multilaterals versus bilaterally, and how present the private sector is in delivery. The distinction between `21` International NGO and `22`/`24` national and partner-country NGOs is especially consequential for localisation measurement, and misclassification here quietly distorts those statistics, so type assignments are worth checking when organisations are first created or imported.',
  },
  {
    id: 'org-identifier',
    term: 'IATI Organisation Identifier',
    category: 'Organisations & People',
    simple: 'A unique code that identifies an organisation across all aid data worldwide.',
    detailed:
      'An IATI organisation identifier is a globally unique code for an organisation, constructed by prefixing the organisation\'s code in an official registration agency with that agency\'s own code. For example, `XM-DAC-41114` identifies UNDP via the OECD DAC channel-code list (`XM-DAC`), while `GB-CHC-285908` identifies a charity registered with the Charity Commission for England and Wales (`GB-CHC`). Because the registration agency prefix is unique and the agency guarantees uniqueness of its own codes, the combination is unique worldwide without any single central register of organisations. Identifiers solve the hardest practical problem in aid data: the same organisation appears in thousands of publishers\' files under dozens of name variants, abbreviations, and spellings, and only a shared identifier lets systems recognise that "UNDP", "United Nations Development Programme", and "PNUD" are one body. This system records identifiers on organisation records and uses them as the primary matching key when importing IATI data, falling back to name matching only where identifiers are absent. Publishing and consuming good identifiers, including in `provider-org` and `receiver-org` references, is among the highest-leverage data-quality practices in the standard.',
  },
  {
    id: 'development-partner',
    term: 'Development Partner',
    category: 'Organisations & People',
    simple: 'An external organisation that provides funding or support to the country, a donor in the broadest sense.',
    detailed:
      'Development partner is the umbrella term for external organisations supporting the country\'s development: bilateral donors (the aid agencies of individual countries), multilateral institutions (UN agencies, development banks, the EU and global funds), international NGOs, and philanthropic foundations. The term is preferred over "donor" in much modern usage, and in this system, because it reflects how cooperation actually works: many partners contribute technical expertise, policy advice, convening power, and implementation capacity alongside or instead of money, and the partnership framing matches the language of the aid-effectiveness agreements in which both providers and recipients took on mutual commitments. The Development Partners page profiles each partner\'s engagement: its portfolio of activities, financial flows over time, sector concentrations, and the share of its records meeting data-quality standards. For government users this supports partner-by-partner coordination and division-of-labour conversations; for the partners themselves it offers a mirror, showing their programme as the national system sees it, which is often a revealing comparison with their internal management figures.',
  },
  {
    id: 'participating-organisation',
    term: 'Participating Organisation',
    category: 'Organisations & People',
    simple: 'Any organisation listed on an activity together with the role it plays in it.',
    detailed:
      'The IATI `participating-org` element attaches organisations to an activity, each with a role code from the OrganisationRole codelist saying what part it plays: who funds the activity, who is accountable for it, who manages the funds onward, and who implements the work. A well-described activity typically lists several participants, and the same organisation can legitimately appear in more than one role, as when an agency both funds a project from its core resources and implements it. Each participating-org entry should carry the organisation\'s IATI identifier as well as its name, because identifiers are what let consuming systems connect the participation to a real organisation record rather than a string of text. Participating organisations are the basis of portfolio views in this system: an organisation\'s profile assembles every activity in which it participates, in any role, which is a different and richer lens than transactions alone, since participation captures involvement even where detailed financial flows have not been published. The system enforces uniqueness per organisation-and-role pairing on an activity, preventing the same organisation from being accidentally listed twice in the same role.',
  },
  {
    id: 'organisation-role',
    term: 'Organisation Role',
    category: 'Organisations & People',
    simple: 'What an organisation does on an activity: funds it, manages it, runs it, or answers for it.',
    detailed:
      'The IATI OrganisationRole codelist defines the four parts an organisation can play on an activity: `1` Funding, the organisation providing the money; `2` Accountable, the organisation responsible for oversight of the activity and its outcomes; `3` Extending, the organisation that manages the budget and direction of the activity on behalf of the funding organisation; and `4` Implementing, the organisation physically carrying out the activity or intervention. The roles describe distinct functions that often sit in different bodies: a foreign ministry funds (`1`), its development agency extends (`3`), a partner-government ministry is accountable alongside it (`2`), and an NGO implements (`4`). Distinguishing the roles is what allows analysis to answer different questions from the same data: funding-role data drives donor attribution and league tables, implementing-role data shows who is actually present and delivering in each sector and location, and extending-role data exposes the intermediary layer through which much aid is channelled. Role assignments should reflect the formal arrangements of the activity, and one organisation holding several roles on the same activity is normal and correct where the facts support it.',
  },
  {
    id: 'funding-organisation',
    term: 'Funding Organisation',
    category: 'Organisations & People',
    simple: 'The organisation putting up the money for an activity.',
    detailed:
      'A funding organisation is a participating organisation with role `1` in the IATI OrganisationRole codelist: the source of the activity\'s resources. It is worth keeping the funding role distinct from the extending role (`3`), which manages funds onward on the funder\'s behalf; in a typical chain a ministry of foreign affairs provides the budget while its implementing agency administers it, and the two organisations take roles `1` and `3` respectively. Funding-role data and transaction-level `provider-org` data answer related but different questions: the participating-org entry declares who funds the activity overall, while provider data attributes each individual flow, and the two should be consistent on a well-formed record. This system\'s donor attribution is provider-centric where transaction data exists, using the funding participant and reporting organisation as fallbacks, so listing funders accurately, with identifiers, directly improves the accuracy of donor league tables and the funding-flow diagrams. Activities with no funding organisation and no provider data end up in the "Unattributed" bucket of donor charts, which is the system being honest about a gap rather than guessing.',
  },
  {
    id: 'implementing-partner',
    term: 'Implementing Partner',
    category: 'Organisations & People',
    simple: 'The organisation doing the actual work on the ground.',
    detailed:
      'An implementing partner is a participating organisation with role `4` in the IATI OrganisationRole codelist: the organisation that physically carries out the activity. Implementers are where aid becomes action: building the infrastructure, running the clinics, training the teachers, distributing the supplies, delivering the technical assistance. Tracking them separately from funders matters for several reasons. Operationally, implementing-role data shows who is actually present in each sector and geographic area, which is the information coordination bodies need to spot overlaps and gaps; a sector working group cares less about whose budget line a clinic project sits on than about which organisations are running clinic projects in which townships. For policy, the identity and type of implementers underpins the localisation agenda: international commitments to channel more resources through national and local organisations can only be monitored if implementer data is complete and correctly typed. And analytically, the funder-to-implementer relationships across a portfolio reveal the structure of the delivery market, including concentration on a few large intermediaries or genuine diversity of national partners.',
  },
  {
    id: 'contact',
    term: 'Contact / Focal Point',
    category: 'Organisations & People',
    simple: 'A named person attached to an activity or organisation whom you can reach with questions.',
    detailed:
      'Contacts are the named people behind the records: the programme manager who can answer questions about an activity, the data focal point responsible for an organisation\'s reporting, the M&E officer who owns the results figures. In IATI published data the equivalent information travels in the `contact-info` element, which carries the contact type, person and job title, organisation, email, telephone, and mailing address. In this system contacts are normalised: each person exists once in a central contacts store, and activities link to people through a junction, so the same individual attached to a dozen activities is one record with a dozen links rather than a dozen duplicate entries. That normalisation is what keeps contact details maintainable (an email changes in one place) and is the foundation of the Rolodex directory. Contact data is easy to dismiss as administrative, but in coordination practice it is often the difference between a data question being resolved in an afternoon and going unanswered: aid information systems run on the ability to phone or email the person who actually knows.',
  },
  {
    id: 'rolodex',
    term: 'Rolodex',
    category: 'Organisations & People',
    simple: 'The system-wide directory of all people and contacts across activities and organisations.',
    detailed:
      'The Rolodex is the system-wide directory assembling every contact into one searchable place: each person appears with their organisation, role and job title, contact details, and the activities they are attached to. It exists because the underlying contact data, normalised though it is, would otherwise only be discoverable by opening individual activity or organisation records one at a time; the Rolodex inverts that, making people the entry point. In coordination work this answers a recurring class of question that activity-centric views handle poorly: who is the focal point for that organisation, who manages health activities in this region, who do I invite to a working-group meeting on a given theme. Because the Rolodex reads the same normalised contacts store used by activity records, it stays consistent automatically: updating a person\'s details anywhere updates them everywhere, and a person linked to new activities appears against them in the directory immediately. Like any directory, its usefulness tracks its completeness, so populating contacts on activities is encouraged as part of routine data entry rather than an optional extra.',
  },
  // ─── Sectors & Classifications ───
  {
    id: 'sector',
    term: 'Sector',
    category: 'Sectors & Classifications',
    simple: 'The area of work an activity belongs to, such as health, education, or agriculture.',
    detailed:
      'Sectors classify what aid is for, answering the "what" question the way locations answer "where" and organisations answer "who". The IATI `sector` element attaches one or more sector codes to an activity (or to individual transactions), each drawn from a stated vocabulary, with the OECD DAC purpose codes as the default and most widely used scheme. Standard codes are the entire point: because thousands of publishers classify against the same lists, data from different organisations can be combined into a single picture of, say, total health funding to a country, which would be impossible if every agency described its work in its own vocabulary. An activity spanning several areas of work splits itself across multiple sector codes with percentage shares summing to 100, and those shares are then applied to financial values when computing sector-level spending. In this system sector codes drive the Sectors browser and profiles, the sector donut and time-series charts, and the "who is doing what where" analysis that coordination bodies rely on, and activities missing sector codes are flagged because every unclassified dollar weakens those views.',
  },
  {
    id: 'dac',
    term: 'OECD DAC',
    category: 'Sectors & Classifications',
    simple: 'The international committee of donor countries that sets the standard definitions used in aid statistics.',
    detailed:
      'The Development Assistance Committee (DAC) of the Organisation for Economic Co-operation and Development (OECD) is the forum where most major bilateral donors coordinate aid policy, and it is the de facto standards body of aid statistics. The DAC defines what counts as Official Development Assistance, maintains the list of countries and territories eligible to receive it, and runs the Creditor Reporting System (CRS), the statistical database to which members report their flows in detail. The classification systems used throughout this application originate there: the sector purpose codes, the aid-type modality categories, the finance-type instrument classification, the flow-type categories, the tied-status definitions, and the policy-marker system are all DAC constructs that the IATI standard adopted so its data would be comparable with official statistics. The DAC also conducts peer reviews of members\' aid programmes and publishes the statistics against which international commitments are tracked. When this glossary or the application refers to "DAC codes" or "DAC definitions", it means classifications from this body, and their authority is exactly why following them, rather than inventing local variants, keeps the data interoperable.',
  },
  {
    id: 'dac-5-code',
    term: 'DAC 5-Digit Sector Code',
    category: 'Sectors & Classifications',
    simple: 'A precise five-digit code for a specific area of work, like 12220 for basic health care.',
    detailed:
      'DAC 5-digit purpose codes are the most granular tier of the OECD DAC sector classification used in Creditor Reporting System statistics, and the default sector vocabulary of the IATI standard. Each code pinpoints a specific purpose of funding: `11220` Primary education, `12220` Basic health care, `14030` Basic drinking water supply and basic sanitation, `15110` Public sector policy and administrative management, and so on across several hundred codes. The structure is hierarchical: the first three digits identify the broader DAC sector category (so `12220` belongs to category `122`, Basic health), which means 5-digit data can always be rolled up to 3-digit summaries but never the reverse. That asymmetry is why IATI guidance encourages publishing at the 5-digit level: detail can be aggregated away when a chart needs simplicity, but a record classified only as "health, general" can never be split back into its real components. This system stores sector allocations at the 5-digit level, displays both the code and its official name, and performs roll-ups to categories and broader groups in its charts, so detailed data entry feeds every level of presentation.',
  },
  {
    id: 'dac-3-category',
    term: 'DAC 3-Digit Sector Category',
    category: 'Sectors & Classifications',
    simple: 'A broader three-digit grouping of sectors, like 122 for basic health.',
    detailed:
      'DAC 3-digit sector categories are the middle tier of the OECD DAC classification: the first three digits of every 5-digit purpose code identify its category, grouping detailed purposes into recognisable fields. Examples include `111` Education, level unspecified, `112` Basic education, `113` Secondary education, `121` Health, general, `122` Basic health, `151` Government and civil society, general, and `311` Agriculture. Categories themselves cluster into the broad DAC sector groups (social infrastructure and services, economic infrastructure, production sectors, multisector, and so on), giving the classification three usable levels of altitude. The 3-digit tier earns its keep in presentation and comparison: a donut chart of a country portfolio drawn at the 5-digit level dissolves into dozens of slivers, while the same data rolled up to categories communicates the shape of the portfolio at a glance. IATI also defines a sector vocabulary (`2`) for publishing directly at the category level, which some organisations use when their internal systems do not hold 5-digit detail; this system accepts such data but treats it as less granular, since category-level records cannot be disaggregated back into specific purposes.',
  },
  {
    id: 'sector-percentage',
    term: 'Sector Percentage',
    category: 'Sectors & Classifications',
    simple: 'How an activity\'s money is split across its sectors, for example 60% health and 40% education.',
    detailed:
      'When an activity spans more than one sector, the IATI standard requires each `sector` element to carry a percentage, and the percentages within each vocabulary must sum to 100. The shares declare how the activity\'s resources divide across its areas of work: a programme classified 60% basic health and 40% basic education is asserting that three-fifths of its money serves health objectives. Sector-level financial analysis is built directly on these declarations. Where transactions do not carry their own sector codes, the system computes sector spending by applying the activity-level percentages to each financial value, an approach the sector analytics label as "imputed" amounts; where transactions do carry sector lines, those take precedence as "actual" transaction-level data, and the charts distinguish the two qualities so analysts know how much of a total rests on proportional assumption versus direct classification. The percentages are consequential, which is why the editor validates that they sum correctly and why thoughtless defaults (such as an even split entered to satisfy validation) quietly degrade every sector chart downstream.',
  },
  {
    id: 'sector-vocabulary',
    term: 'Sector Vocabulary',
    category: 'Sectors & Classifications',
    simple: 'Which coding scheme a sector code comes from, since several different schemes exist.',
    detailed:
      'Because more than one sector classification exists, every IATI sector code must declare which scheme it belongs to via the `vocabulary` attribute, drawing on the SectorVocabulary codelist: `1` OECD DAC CRS purpose codes at the 5-digit level (the default), `2` OECD DAC purpose codes at the 3-digit category level, `7` SDG Goals, `8` SDG Targets, `98` and `99` for vocabularies defined by the reporting organisation itself, and several others including humanitarian cluster classifications. The vocabulary attribute is what makes a bare code interpretable: `122` means basic health in vocabulary `2` but could mean something entirely different in an organisation\'s internal scheme. An activity may carry sector codes from several vocabularies in parallel, classifying the same work simultaneously against DAC purposes and SDG goals, and the standard requires percentages to sum to 100 within each vocabulary independently. When custom (`99`) vocabularies are used, IATI asks publishers to provide a `vocabulary-uri` documenting the scheme. This system reads vocabularies on import, stores DAC-coded data as its analytical backbone, and uses SDG vocabularies to power the SDG alignment views.',
  },
  {
    id: 'policy-marker',
    term: 'Policy Marker',
    category: 'Sectors & Classifications',
    simple: 'A flag showing whether an activity addresses a cross-cutting theme such as gender equality or climate.',
    detailed:
      'Policy markers are the OECD DAC\'s mechanism for tracking aid against cross-cutting policy objectives that sector codes cannot capture, published in IATI through the `policy-marker` element. The DAC marker set includes gender equality, aid to environment, participatory development and good governance, trade development, the four Rio Convention markers (biodiversity, climate change mitigation, climate change adaptation, and desertification), disaster risk reduction, disability inclusion, nutrition, and reproductive, maternal, newborn and child health (RMNCH). Markers work differently from sectors in a crucial way: they do not divide money. A sector percentage splits the budget; a marker scores the whole activity for whether and how strongly it pursues the objective, using the significance scale. This makes markers the right tool for questions like "how much of the portfolio is gender-responsive?" and the established basis of international climate-finance accounting, where mitigation and adaptation markers (weighted by significance) determine what counts. Marker data quality varies across publishers, and over-generous self-scoring is a known issue in DAC statistics, so this system displays marker-based figures with their significance breakdown rather than as a single unqualified number.',
  },
  {
    id: 'policy-significance',
    term: 'Policy Marker Significance',
    category: 'Sectors & Classifications',
    simple: 'How central a theme is to the activity: not at all, an important goal, or the main goal.',
    detailed:
      'Every policy marker on an activity carries a significance score from the OECD DAC scale, published in IATI\'s PolicySignificance codelist: `0` Not targeted (the activity was screened against the objective and does not pursue it), `1` Significant objective (the objective is important and deliberate, but not the main reason the activity exists), and `2` Principal objective (the objective is fundamental to the activity\'s design; it would not have been undertaken without it). Two markers extend the scale: the desertification Rio marker uses `3` for activities that are principal-objective and undertaken in support of an action programme under the Convention, and the RMNCH marker uses `4` for activities whose explicit primary objective is reproductive, maternal, newborn and child health. The score `0` carries real information, since it distinguishes "screened and not targeted" from "never assessed", which is why the standard treats an absent marker and a zero-scored marker differently. Aggregations must respect the scale: principal and significant activities are routinely reported separately (and climate-finance methodologies apply different weightings to each), because folding them into one number overstates how much of a portfolio truly centres on the objective.',
  },
  {
    id: 'sdgs',
    term: 'Sustainable Development Goals (SDGs)',
    category: 'Sectors & Classifications',
    simple: 'The 17 global goals all countries agreed to reach by 2030, such as No Poverty and Quality Education.',
    detailed:
      'The Sustainable Development Goals are the 17 goals at the heart of the United Nations 2030 Agenda for Sustainable Development, adopted by all member states in 2015: ending poverty and hunger, health, education, gender equality, water and sanitation, energy, decent work, infrastructure, reduced inequalities, sustainable cities, responsible consumption, climate action, life below water and on land, peace and justice, and partnerships. Beneath the goals sit 169 targets and a global indicator framework through which progress is formally measured. The SDGs matter to aid data because they are the closest thing to a universal results language: governments write them into national plans, donors map their portfolios to them, and aligning the two is a standing coordination exercise. IATI supports the mapping concretely, with sector vocabulary `7` for goals, vocabulary `8` for targets, and `tag` elements as an alternative route, so activities can declare which goals they serve. This system\'s SDGs section aggregates those declarations into a portfolio-level view, showing how funding distributes across the goals and where stated national priorities are thinly supported, with the usual caveat that self-declared alignment is a claim about intent rather than evidence of contribution.',
  },
  {
    id: 'sdg-target',
    term: 'SDG Target',
    category: 'Sectors & Classifications',
    simple: 'A specific, numbered objective under one of the 17 global goals, like target 3.1 on maternal mortality.',
    detailed:
      'Each Sustainable Development Goal breaks down into numbered targets, 169 in all, that turn broad ambitions into specific commitments: target `3.1` is to reduce the global maternal mortality ratio to below 70 per 100,000 live births, target `4.1` is to ensure all children complete free, equitable and quality primary and secondary education, target `6.1` is universal and equitable access to safe and affordable drinking water. Each target in turn has official indicators through which progress is measured in the UN framework. Targets are where SDG alignment becomes analytically useful: mapping an activity to "Goal 4, Quality Education" says little, because education is vast, but mapping it to target `4.5` (eliminate gender disparities in education) states precisely which lever the activity pulls and invites comparison against the matching national statistics. IATI carries target-level alignment through sector vocabulary `8`, and this system displays target mappings where publishers provide them. The practical guidance for data entry follows from the analytics: align to targets rather than bare goals wherever the activity\'s design supports it, and resist mapping a single activity to long lists of targets it touches only incidentally.',
  },
  {
    id: 'tag',
    term: 'Tag',
    category: 'Sectors & Classifications',
    simple: 'A free-form label you can attach to activities to group them in ways the standard codes do not cover.',
    detailed:
      'The IATI `tag` element, added to the standard in version 2.03, lets publishers classify activities using vocabularies beyond the formal sector and policy schemes: each tag carries a vocabulary, a code, and a human-readable narrative, with defined vocabularies for SDG goals and targets and an open option (`99`) for anything the reporting organisation defines, accompanied by a `vocabulary-uri` documenting the scheme. Tags fill the space between rigid standard codelists and real coordination needs, which constantly produce groupings the DAC codes never anticipated: pillars of a national development plan, a government flagship initiative, a humanitarian appeal, a thematic window inside a trust fund, a research cohort of projects. In this system tags are managed centrally so the same label is spelled and applied consistently rather than fragmenting into variants, each tag has a profile page assembling every activity that carries it, and tag-based filters work across charts and lists. The discipline that keeps tags useful is curation: a small set of well-defined, consistently applied tags supports real analysis, while an uncontrolled folksonomy of near-duplicates degrades into noise.',
  },
  {
    id: 'humanitarian-marker',
    term: 'Humanitarian Marker',
    category: 'Sectors & Classifications',
    simple: 'A flag showing that an activity (or one of its transactions) is emergency or relief work rather than long-term development.',
    detailed:
      'IATI marks humanitarian assistance with a boolean `humanitarian` attribute that can be set at the activity level (the whole activity is humanitarian) or per transaction (only certain flows within a mixed activity are), the transaction-level option existing because real programmes increasingly blend relief and development components that should not be classified wholesale. Alongside the flag, the `humanitarian-scope` element can tie an activity to a specific emergency or appeal using established humanitarian reference codes (GLIDE numbers for disasters, UN appeal codes), which is what allows funding to be assembled per crisis rather than only per country. The distinction the marker draws is consequential: humanitarian and development assistance follow different funding cycles (rapid appeals versus multi-year programming), different coordination architectures (the cluster system versus sector working groups), and different reporting ecosystems (humanitarian flows are also tracked in OCHA\'s Financial Tracking Service). Analysts therefore routinely need the two separated, and the humanitarian and development split in this system\'s analytics rests on this field, including for questions at the policy frontier between them, such as how much crisis funding flows through development instruments, the territory of the humanitarian-development nexus.',
  },
  // ─── Locations & Geography ───
  {
    id: 'location',
    term: 'Location',
    category: 'Locations & Geography',
    simple: 'A place where an activity happens, from a whole region down to a single village or facility.',
    detailed:
      'The IATI `location` element describes where an activity is delivered, and it is deliberately rich because "where" can mean very different things: a location entry can carry a name and description, administrative-area codes tying it to official jurisdictions, point coordinates, a gazetteer reference (such as a GeoNames identifier), and classifying codes for what kind of place it is (the location class and feature designation), how precisely it is known (geographic exactness), and how the activity relates to it (the location-reach code distinguishes where the activity happens from where its intended beneficiaries live, which for an advocacy campaign or a broadcast service can be quite different places). An activity may have many locations, and good practice is to publish them at the finest level operational security and data availability allow. Location data converts an aid portfolio from a list into a map: in this system it powers the Atlas, location profile pages, and subnational analysis showing what is happening in each state, region, and township, which is precisely the view subnational planners and coordination bodies otherwise lack.',
  },
  {
    id: 'administrative-area',
    term: 'Administrative Area',
    category: 'Locations & Geography',
    simple: 'An official unit of the country, such as a state, region, district, or township.',
    detailed:
      'Administrative areas are the official subdivisions through which a country governs itself, arranged in levels: first-level units (states and regions), then successively finer units (districts, townships, communes, wards) depending on the national structure. The IATI location model attaches activities to these units through the `administrative` element, which carries a vocabulary, a level, and a code from a recognised gazetteer, so that "this project works in township X" is recorded as a code computers can aggregate rather than a spelling that may or may not match anyone else\'s. Coding against administrative areas is what makes aid data joinable with the rest of national statistics: population, poverty rates, service coverage, and budget allocations are all published by administrative unit, so aid coded the same way can be set beside them to ask whether resources are flowing where needs are greatest. In this system administrative coding drives the choropleth maps shaded by jurisdiction, the location profile pages, and any analysis of geographic equity, and it complements point coordinates: coordinates say exactly where, administrative codes say within whose responsibility.',
  },
  {
    id: 'recipient-country',
    term: 'Recipient Country',
    category: 'Locations & Geography',
    simple: 'The country that benefits from an activity\'s funding.',
    detailed:
      'The IATI `recipient-country` element states which country an activity\'s resources benefit, using ISO 3166-1 alpha-2 country codes (for example `MM` for Myanmar), with a percentage attribute for activities spanning several countries so the value can be apportioned among them. Together with `recipient-region` it forms the standard\'s geographic targeting layer: the combined percentages across countries and regions on an activity should total 100, so that every dollar has a stated destination. The field sounds trivial inside a single-country aid information system, where most records naturally point at the host country, but it carries real weight at the boundaries: imported data must be filtered by recipient country to keep the system\'s scope clean, multi-country activities must contribute only their national share to country totals rather than their full value, and funding envelopes record recipient country explicitly (defaulting to the host country) because organisation-level forward budgets follow the same IATI logic. Recipient-country data is also how the global IATI ecosystem assembles country pictures across thousands of publishers, which is exactly the operation this system performs when importing from the Datastore.',
  },
  {
    id: 'recipient-region',
    term: 'Recipient Region',
    category: 'Locations & Geography',
    simple: 'A multi-country region that benefits from an activity when no single country applies.',
    detailed:
      'The IATI `recipient-region` element handles activities whose benefits flow to a region rather than to identifiable countries: regional programmes for South-East Asia, continental initiatives, cross-border infrastructure, research benefiting many countries at once. Codes come by default from the OECD DAC region codelist (the vocabulary attribute can name alternatives), and like recipient-country entries each carries a percentage, with the standard requiring the combined country and region percentages on an activity to sum to 100. Regional coding is honest reporting (some aid genuinely cannot be assigned to single countries) but it creates a known analytical challenge: regional flows are invisible in country-level totals, so a country may benefit substantially from regional programmes that no national aid information system captures, and global statistics show meaningful volumes parked against regions rather than countries. For this system the practical rules are about boundaries: a regional activity touching the host country should not claim its full value in national totals (only any explicit country-percentage share), and analysts comparing national figures against donors\' global publications should expect part of the difference to sit in regional allocations.',
  },
  {
    id: 'coordinates',
    term: 'Coordinates / Geocoding',
    category: 'Locations & Geography',
    simple: 'The exact latitude and longitude of an activity site, so it can be shown as a pin on a map.',
    detailed:
      'Geocoding attaches point coordinates to activity locations: the IATI location model carries them in a `point` element holding a latitude-longitude pair (using the WGS84 coordinate system that underlies GPS and virtually all web mapping), accompanied by codes that say how to interpret the point. The most important of these is geographic exactness, `1` Exact (the coordinates mark the actual site) or `2` Approximate (the point stands in for somewhere less precisely known, commonly the centroid of the administrative area the activity works in), with the location class and feature designation adding what kind of place the point represents. The interpretive codes matter as much as the coordinates: maps built from mixed exact and approximate points mislead unless the distinction is carried through, since a cluster of pins on a district centre may mean ten projects at ten unknown sites in that district rather than ten projects at one spot. In this system coordinates drive the Atlas map and any site-level analysis, while approximate locations are better served by administrative-area coding; the strongest records carry both, coordinates for precision and administrative codes for joinability with national statistics.',
  },
  {
    id: 'activity-scope',
    term: 'Activity Scope',
    category: 'Locations & Geography',
    simple: 'How wide an activity\'s reach is: global, regional, national, or local.',
    detailed:
      'The IATI ActivityScope codelist summarises the geographic ambition of an activity in a single code: `1` Global, `2` Regional, `3` Multi-national, `4` National, `5` Sub-national spanning more than one first-level administrative area, `6` Sub-national within a single first-level area, `7` Sub-national within a single second-level area, and `8` Single location. Scope does not replace the detailed location data; it frames it, declaring the level at which the activity operates so consumers know what location detail to expect and how to read its absence. A national policy-support activity (`4`) legitimately has no site coordinates, because advising a ministry happens at the level of the state rather than at mappable sites, whereas an `8` Single location activity without coordinates is simply incomplete. Data-quality logic in this system uses scope exactly this way, calibrating location expectations to the declared reach instead of penalising every record that lacks a pin. Scope also supports portfolio-level analysis of how aid is structured: the balance between nationwide programmes and tightly localised projects is itself a meaningful description of how partners engage with the country.',
  },

  // ─── Results & Monitoring ───
  {
    id: 'results-framework',
    term: 'Results Framework',
    category: 'Results & Monitoring',
    simple: 'The structured plan of what an activity intends to achieve and how progress is measured.',
    detailed:
      'A results framework is the structured account of what an activity is for: a hierarchy of intended results (outputs, outcomes, and impact), each measured by one or more indicators, each indicator anchored by a baseline and tracked through time-bound periods carrying targets and actuals. The structure encodes the activity\'s causal logic, the chain from what the project delivers to the changes those deliverables are meant to produce, and it is what turns "we spent the budget" into "and here is what it achieved". The IATI standard carries the whole structure through the `result` element and its children (`indicator`, `baseline`, `period`, `target`, `actual`), making results data as publishable and aggregable as financial data, though in practice results remain the least consistently published part of the standard. In this system the framework is entered in the Activity Editor and rendered through a shared presentation, deliberately modelled on d-portal\'s familiar layout, used identically in the editor and on the public activity profile, so the version of the results a data-entry officer maintains is exactly what the public sees.',
  },
  {
    id: 'result',
    term: 'Result',
    category: 'Results & Monitoring',
    simple: 'A specific change or product an activity intends to deliver.',
    detailed:
      'In the IATI standard a result is one declared achievement-area of an activity, published through the `result` element with a type from the ResultType codelist: `1` Output, `2` Outcome, `3` Impact, or `9` Other for frameworks that do not map onto the standard chain. Each result has a title and description and contains the indicators through which it is measured, so the element is the container that holds the measurement apparatus together: an activity typically declares a handful of results, each with one or more indicators, each indicator with baselines, targets, and actuals per period. The result element also carries an `aggregation-status` flag indicating whether its data is suitable for aggregation beyond the activity, an honest acknowledgement that not all results data can be meaningfully summed. Well-formed results distinguish their levels cleanly, because mixing them in one undifferentiated list (a classic results-reporting fault) hides whether an activity is claiming things it controls or changes it hopes to influence. Results data is what converts an activity record from a financial accountability document into a performance accountability document, the basis for asking not just where the money went but what it did.',
  },
  {
    id: 'output',
    term: 'Output',
    category: 'Results & Monitoring',
    simple: 'The direct, countable products of an activity: schools built, people trained, kits distributed.',
    detailed:
      'Outputs, IATI result type `1`, are the direct products and services an activity delivers: classrooms constructed, health workers trained, textbooks distributed, kilometres of road rehabilitated, policy drafts submitted. Their defining property is controllability, since outputs lie within the project\'s own power: given the budget and competent execution, the planned outputs should materialise, which makes them the cleanest level for accountability over implementation, the level at which delivery failures are unambiguous, and the easiest data to verify. Their limitation is equally fundamental: outputs say nothing by themselves about whether anything improved. Trained health workers may not be deployed, constructed classrooms may stand empty, distributed equipment may go unused, so a results story told entirely in outputs is an unfinished story. Sound frameworks therefore link each output upward to the outcomes it is expected to enable, making the causal claim explicit and testable. In results data, outputs are typically the most numerous and most frequently updated result entries, and their indicators (usually simple counts) are where target-versus-actual tracking is most straightforward.',
  },
  {
    id: 'outcome',
    term: 'Outcome',
    category: 'Results & Monitoring',
    simple: 'The medium-term change an activity causes, like more children completing school.',
    detailed:
      'Outcomes, IATI result type `2`, are the changes an activity brings about among the people and institutions it serves: enrolment and completion rates rising, vaccination coverage improving, farmers adopting better practices, a ministry actually using the planning system it was helped to build. Outcomes occupy the middle of the results chain, the level at which deliverables convert into change, and they differ from outputs in a way that shapes how they must be read: they are not fully within the project\'s control. An activity contributes to outcomes alongside other actors, government policy, and context, so outcome reporting is a claim of contribution rather than simple delivery, and outcome indicators need baselines and targets precisely because change only has meaning against a starting point and an ambition. Outcomes are where most evaluative interest concentrates (they are the difference between activity and achievement), and they are also where measurement gets harder and slower: outcome data often arrives through surveys and administrative statistics with a lag, which is why frameworks track them over longer periods than outputs and why missing outcome actuals mid-implementation are normal rather than alarming.',
  },
  {
    id: 'impact',
    term: 'Impact',
    category: 'Results & Monitoring',
    simple: 'The long-term, big-picture change an activity contributes to, like lower child mortality.',
    detailed:
      'Impact, IATI result type `3`, is the top of the results chain: the durable, large-scale improvements in people\'s lives and societies to which an activity contributes, such as reduced child mortality, falling poverty rates, or strengthened democratic institutions. Two features distinguish impact from everything below it. First, attribution is diffuse: impacts emerge from the combined work of governments, many programmes, economic forces, and time, so no single project can honestly claim them alone, and well-written frameworks phrase impact as a contribution to national or sector goals rather than a deliverable. Second, the timescale usually exceeds the activity: impact materialises years after closure, which is why impact-level indicators are commonly drawn from national statistics and SDG indicators rather than project monitoring, anchoring the activity\'s ambitions to measures that will keep being collected after it ends. The practical value of declaring impact in a framework is orientation, keeping outputs and outcomes pointed at something that matters, and in aggregated views impact statements show how a portfolio\'s many separate efforts align (or fail to align) with the national goals they all invoke.',
  },
  {
    id: 'indicator',
    term: 'Indicator',
    category: 'Results & Monitoring',
    simple: 'The specific thing you measure to know whether a result is being achieved.',
    detailed:
      'An indicator is the measurable variable chosen to track progress toward a result, carried in IATI by the `indicator` element inside each result. The element\'s structure encodes good measurement practice: a `measure` attribute from the IndicatorMeasure codelist (`1` Unit for counts, `2` Percentage, `3` Nominal, `4` Ordinal, `5` Qualitative) says what kind of quantity this is; an `ascending` flag declares which direction is improvement, so a rising malnutrition rate is never accidentally rendered as progress; an optional reference can tie the indicator to a standard framework (such as the SDG indicator set) rather than a bespoke definition; and within the indicator sit the baseline and the time-bound periods holding targets and actuals. Indicator quality determines results-data quality: a well-chosen indicator is specific, measurable at reasonable cost, and genuinely informative about the result rather than merely convenient to count, and using standard indicator definitions where they exist makes results comparable across activities and publishers. In this system indicators are the unit at which results progress is actually displayed and computed, with the measure type and direction driving how each chart and progress figure is drawn.',
  },
  {
    id: 'baseline',
    term: 'Baseline',
    category: 'Results & Monitoring',
    simple: 'The starting value of an indicator before the activity begins, so change can be measured against it.',
    detailed:
      'The baseline records an indicator\'s value before the activity\'s influence begins, carried in IATI by the `baseline` element with a value, the year it was measured, and an optional comment on sources and caveats. Baselines are the foundation of all subsequent interpretation: an achievement of "500 children enrolled" is unreadable without knowing whether enrolment started at 100 or at 480, and a target of 70% coverage means entirely different ambition from a baseline of 65% than from one of 20%. The standard\'s inclusion of the baseline year matters too, since a figure measured five years before the activity started describes a different starting world than one measured at launch. Weak baselines are among the most common and damaging results-data failures: missing baselines make progress claims unverifiable, while retro-fitted ones (reconstructed after implementation began, sometimes from memory) quietly bias measured change. The discipline the field asks for is simple to state and operationally demanding: measure before you start, document how, and record the result where the rest of the framework can use it, which is exactly the slot this element provides.',
  },
  {
    id: 'target',
    term: 'Target',
    category: 'Results & Monitoring',
    simple: 'The value an indicator is supposed to reach by the end of a period.',
    detailed:
      'A target is the level of achievement an activity commits to reaching on an indicator within a defined window, carried in IATI by the `target` element inside each indicator `period` (and so naturally supporting trajectories: a series of period targets stepping from baseline toward the end-of-project ambition, against which the pace of progress can be judged, not just its endpoint). Targets convert measurement into accountability, since an indicator without one merely observes, and target-setting quality shapes everything downstream: meaningful targets are grounded in the baseline, the budget, the timeframe, and evidence about what comparable interventions achieve. Both failure modes are common and corrosive in results data: inflated targets manufacture failure and erode trust in reporting, while padded targets that delivery will trivially exceed manufacture success and hide underperformance, and systematic over-achievement across a portfolio is as much a red flag as systematic shortfall. In this system targets are displayed beside actuals for each period with progress indication, and revisions to targets mid-implementation deserve documentation, because a target quietly lowered to meet performance is precisely what transparent results data exists to expose.',
  },
  {
    id: 'actual',
    term: 'Actual',
    category: 'Results & Monitoring',
    simple: 'The value an indicator really reached, as measured during or after the period.',
    detailed:
      'The actual is the measured value of an indicator for a period, carried in IATI by the `actual` element alongside the period\'s target and supported by an optional comment and, from the data side, document links to the sources behind the figure. Actuals are where the results framework meets reality: every other element (results, indicators, baselines, targets) is design, while the actual is evidence, and the integrity of results reporting rests on actuals being genuine measurements rather than estimates dressed as data. Reading actuals well takes context that good publishers supply: the measurement method and its limitations, whether the figure is cumulative or period-specific (a chronic source of double counting when consumers guess wrong), and whether late or missing values reflect collection lag, which is routine for survey-based outcome indicators, or genuine reporting failure. Sequences of actuals against targets across periods are the core performance picture this system draws: on-track, ahead, or falling behind, and when course corrections show up in the trajectory. Aggregating actuals across activities is only meaningful for comparably defined indicators, which is why standard indicator references and the result-level aggregation-status flag exist.',
  },
  {
    id: 'program-logic',
    term: 'Program Logic / Theory of Change',
    category: 'Results & Monitoring',
    simple: 'A diagram of how an investment\'s pieces connect: what leads to what on the way to the end goal.',
    detailed:
      'A theory of change is the explicit account of how an intervention is supposed to work: the pathway from resources and activities through outputs to outcomes and impact, together with the assumptions each causal step depends on. Making the logic explicit is what turns a project document into something testable, since each link ("training health workers will improve service quality", "improved quality will increase utilisation") is a hypothesis that monitoring data can support or undermine, and the assumptions mark where the design is most vulnerable. The Program Logic feature in this system models an investment\'s causal chain as a directed graph rather than a strict tree, which matters because real programme logic branches and merges: one output can feed several outcomes, several activities can converge on one result, and forcing such structures into a tree falsifies them. Nodes represent elements of the chain at their various levels, edges represent the claimed causal links, and the diagram complements the results framework: the framework holds the measurements, the program logic holds the reasoning that explains why those measurements were chosen and what story connects them.',
  },
  // ─── IATI Standard ───
  {
    id: 'iati',
    term: 'IATI',
    category: 'IATI Standard',
    simple: 'The International Aid Transparency Initiative, the global standard for publishing open aid data.',
    detailed:
      'The International Aid Transparency Initiative is a voluntary, multi-stakeholder initiative launched at the Accra High Level Forum on Aid Effectiveness in 2008 to make information about development and humanitarian resources open, timely, comprehensive, and comparable. Its members span donor governments, partner countries, multilateral institutions, and civil society, and its core product is the IATI Standard: a common, machine-readable format in which any organisation can publish what it funds, where, with whom, and to what effect. Well over a thousand organisations now publish, from the largest multilateral banks to small national NGOs, and because everyone publishes to the same schema, their data can be combined: a partner government can assemble the activities of all its partners into one national picture, which is precisely the operation an aid information management system performs. IATI is publish-once, use-everywhere infrastructure, with the data flowing from publishers through the Registry and Datastore to platforms like d-portal and systems like this one. This application is built around the IATI data model end to end, so the records it holds are interoperable with that wider ecosystem by construction.',
  },
  {
    id: 'iati-standard',
    term: 'IATI Standard 2.03',
    category: 'IATI Standard',
    simple: 'The specific version of the IATI rulebook this system follows.',
    detailed:
      'The IATI Standard is the technical specification behind the initiative, and `2.03` is the version this system implements. The standard has three load-bearing parts: the schema, which defines the XML elements and attributes and how they nest (an activity contains transactions, a transaction contains a value, and so on); the codelists, which enumerate the allowed values for coded fields (activity status, transaction types, sector vocabularies, organisation roles, and dozens more); and the rulesets, which add logical requirements the schema alone cannot express, such as sector percentages summing to 100 within a vocabulary. Version `2.03`, released in 2018, is the most widely adopted decimal of the 2.x series and added, among other things, the `tag` element and transaction-level humanitarian marking. Versioning matters for interoperability: consuming systems need to know which elements and codes to expect, and integer upgrades (1.x to 2.x) were breaking changes while decimal upgrades are backwards-compatible. The Activity Editor\'s tabs and fields deliberately mirror the `2.03` activity structure, so data entered here can be exported as valid IATI XML without translation losses.',
  },
  {
    id: 'iati-xml',
    term: 'IATI XML',
    category: 'IATI Standard',
    simple: 'The machine-readable file format used to exchange aid data between systems.',
    detailed:
      'IATI data travels as XML, a structured text format in which every piece of information sits inside named, nested elements: an `iati-activities` document contains `iati-activity` records, each containing elements like `title`, `participating-org`, `sector`, and `transaction`, down to the attributes carrying codes, dates, and currencies. XML suits the purpose because aid data is deeply hierarchical (activities contain transactions which contain values with attributes) and because an XML schema allows strict, automatic validation: a file either conforms to the standard or fails with precise errors, which is what keeps data from thousands of publishers mutually intelligible. A typical publication consists of one or more activity files plus an organisation file (carrying organisation-level data such as total budgets and country forward plans), registered so consumers can find them. Nobody is expected to write XML by hand: publishing tools and systems like this one generate it, and import tools parse it. This system both consumes IATI XML, mapping elements into its database during imports, and produces it for export, which is what makes records portable between this AIMS, donor systems, and the global platforms.',
  },
  {
    id: 'iati-datastore',
    term: 'IATI Datastore',
    category: 'IATI Standard',
    simple: 'The central online database holding all published IATI data, which this system can pull from.',
    detailed:
      'The IATI Datastore is the queryable aggregation of the entire IATI corpus: it continuously fetches every dataset registered on the IATI Registry, validates and indexes it, and exposes the result through an API, so consumers can ask one service for, say, all activities with a given recipient country instead of downloading and parsing thousands of publishers\' files themselves. The current Datastore is built on Solr, a search-index technology, which gives it a particular query style and operational envelope: results are paged with a maximum of 1,000 rows per request, authentication is via an API key sent in the `Ocp-Apim-Subscription-Key` header, and rate limits apply, which is why this system\'s import pipeline waits about 13 seconds between successive pages when pulling large result sets. For an aid information management system the Datastore is transformative: development partners who already publish to IATI need not re-enter their portfolios by hand, because the system can query the Datastore for activities relevant to the country and import them directly, turning global open data into pre-filled national records whose quality then only needs review rather than creation from scratch.',
  },
  {
    id: 'iati-publisher',
    term: 'IATI Publisher',
    category: 'IATI Standard',
    simple: 'An organisation that has registered to publish its aid data to the IATI Registry.',
    detailed:
      'An IATI publisher is an organisation that has taken on publishing its own data to the standard: it registers an account on the IATI Registry, establishes its organisation identifier, produces activity and organisation files, and registers the links to those files so the ecosystem (the Datastore, d-portal, and consuming systems like this one) can find and fetch them. The publisher is, by definition, the reporting organisation of the activities in its files: publishing is first-person reporting, each organisation telling its own part of the story, and the ecosystem\'s combined picture emerges from thousands of such accounts rather than from any central data collection. Publisher identity matters for provenance and accountability: every imported record in this system traces back to the publisher whose file it came from, which establishes both whom to ask when something looks wrong and who owns the record\'s ongoing maintenance. Publishers range from government ministries and multilateral banks to small NGOs, many publishing because funders (or their own headquarters) require it, and the practical payoff inside a country system is direct: a partner that publishes well can have its portfolio imported rather than typed.',
  },
  {
    id: 'codelist',
    term: 'Codelist',
    category: 'IATI Standard',
    simple: 'An official list of allowed values for a field, so everyone uses the same codes for the same things.',
    detailed:
      'Codelists are the controlled vocabularies of the IATI Standard: official enumerations of the values a coded field may take, each pairing a short code with a defined meaning. ActivityStatus, TransactionType, AidType, FinanceType, FlowType, OrganisationRole, OrganisationType, SectorVocabulary, PolicySignificance, and dozens more each govern one field, and several of the most important ones are maintained outside IATI by the OECD DAC and adopted by reference, so aid data stays aligned with official statistics. Codelists are what make comparability real rather than aspirational: because every publisher reports a disbursement as transaction type `3` and general budget support as aid type `A01`, data from unrelated organisations can be merged, filtered, and summed without interpretation. IATI distinguishes embedded codelists (integral to the schema, changeable only with a new standard version) from non-embedded ones (updateable between versions as the world changes, for example when new aid modalities are defined). In this system, virtually every dropdown in the Activity Editor is populated from a codelist, storing the code while displaying the human-readable name, which is the mechanism keeping entered data exportable and interoperable.',
  },
  {
    id: 'narrative',
    term: 'Narrative',
    category: 'IATI Standard',
    simple: 'The human-readable text of a field, which can exist in several languages at once.',
    detailed:
      'In IATI XML, human-readable text never sits directly inside elements like `title` or `description`; it sits inside `narrative` child elements, each optionally carrying an `xml:lang` attribute naming its language. The design makes multilingualism structural rather than an afterthought: a single title element can hold parallel narratives in English, French, and a national language, all equally part of the record, which suits a standard serving publishers and audiences across many language communities. A `default-language` declared on the activity covers narratives that do not state their own. The same pattern repeats everywhere text appears (titles, descriptions, organisation names, result statements, document titles), so any consuming system must decide how to choose among multiple narratives. On import this system selects the most appropriate narrative for display, preferring English or the declared default language, while the existence of the pattern explains an otherwise puzzling phenomenon: the same imported activity can legitimately carry its title in several languages, and which one a given platform shows is a presentation choice, not a data difference. For narrative quality the standard\'s advice is workmanlike: titles concise and specific, descriptions genuinely informative rather than boilerplate.',
  },
  {
    id: 'd-portal',
    term: 'd-portal',
    category: 'IATI Standard',
    simple: 'A public website where anyone can browse published IATI data by country or organisation.',
    detailed:
      'd-portal (at d-portal.org) is the IATI ecosystem\'s long-standing public viewer: a website where anyone, without accounts or technical skills, can browse published aid data country by country and publisher by publisher, drill into individual activities, and see their budgets, transactions, locations, documents, and results laid out readably. It draws on the same aggregated data as the Datastore, so what it shows is the global published corpus, and it has historically served as the quick answer to "what does our published data actually look like?", the place a publisher\'s staff, a partner government, or a journalist can inspect any organisation\'s records as the world sees them. That checking function matters inside this system too: comparing a partner\'s d-portal listing against its records here is a fast way to spot import gaps or stale publications. d-portal also shaped presentation conventions across the ecosystem, and this system\'s results framework display deliberately follows its layout, so users moving between the public viewer and this application read results data the same way in both places. A successor platform with country and publisher views continues the same public-window role.',
  },
  {
    id: 'iati-import',
    term: 'IATI Import',
    category: 'IATI Standard',
    simple: 'Pulling activities into the system from published IATI data instead of typing them in.',
    detailed:
      'IATI import is the pipeline that turns published IATI data into records in this system: the source can be an uploaded XML file or a direct query against the Datastore, and in either case the pipeline parses activities, maps the standard\'s elements onto the system\'s data model, resolves references, and creates or updates records. The resolution steps are where the engineering lives. Activities are matched by IATI identifier so re-imports update rather than duplicate; organisations named in `reporting-org`, `participating-org`, `provider-org`, and `receiver-org` are matched against existing organisation records by identifier and name, with new records created only when no match exists; sector codes, dates, and monetary values are normalised, currencies resolved through the default-currency rules, and USD values computed at the value-date exchange rate. Child records (transactions, budgets, sectors, locations, contacts) are inserted in batches with a per-record fallback, so one malformed row does not sink an import. Every import produces a logged summary of what was created, updated, and skipped with reasons, and import logs are reviewable in the Admin panel, since imported data inherits the quality of its source and deserves the same review as hand-entered records.',
  },
  {
    id: 'publishing',
    term: 'Publishing to IATI',
    category: 'IATI Standard',
    simple: 'Releasing your activity data as open data that the rest of the world can use.',
    detailed:
      'Publishing to IATI means making your data part of the global open corpus: generating valid IATI XML from your activities, hosting the files at stable URLs, and registering them on the IATI Registry so the Datastore, d-portal, and every other consumer can find and fetch them. From there the data flows automatically into the ecosystem and into any country system that imports from it. Many organisations publish under obligation (grant agreements from major funders commonly require IATI publication, and donor headquarters frequently mandate it across their delivery chains), but the deeper logic is the publish-once principle: one good publication can satisfy many information demands that would otherwise each arrive as a separate spreadsheet request. For organisations using this system, the alignment between its data model and the standard is the point: the same records maintained here for national coordination can be exported as standards-compliant XML, making publication a by-product of data they already keep rather than a parallel reporting burden. Good publication practice mirrors good data practice generally: publish regularly (the standard encourages at least quarterly), keep identifiers stable, and treat validator findings as a maintenance queue.',
  },

  // ─── Data Quality & Tools ───
  {
    id: 'data-clinic',
    term: 'Data Clinic',
    category: 'Data Quality & Tools',
    simple: 'The tool that finds gaps and problems in your data and helps you fix them in bulk.',
    detailed:
      'The Data Clinic is the system\'s dedicated data-quality workspace: it scans activities, transactions, and organisations for missing and inconsistent fields, and presents what it finds in editable tables designed for rapid repair rather than mere reporting. Typical findings include transactions with no linked provider or receiver organisation, values missing USD conversions, activities without sector codes or dates, and organisations named in text but never linked to a real organisation record (shown with an explicit "Unlinked" badge). Two design rules keep it trustworthy: every query respects the recycle bin, so soft-deleted records never resurface as fixable gaps, and every flagged gap corresponds to a column visible in the same table, so a fix can be made and verified in one place without navigating elsewhere. Fixes are made inline and in bulk, which changes the economics of data quality: closing a hundred small gaps becomes an afternoon\'s focused work instead of a hundred separate record visits. The Clinic\'s gap counts per organisation also make quality concrete for partners, converting "please improve your data" into a specific, countable to-do list.',
  },
  {
    id: 'recycle-bin',
    term: 'Recycle Bin',
    category: 'Data Quality & Tools',
    simple: 'Where deleted records go first, so they can be restored if deleted by mistake.',
    detailed:
      'Deletion in this system is soft by design: removing a record stamps it with a deletion timestamp rather than erasing it, which makes the record vanish from every list, search, chart, and aggregation while remaining physically present in the database. The Recycle Bin is the management surface over those soft-deleted records, where they can be reviewed and restored. The pattern exists because deletion mistakes in shared systems are inevitable and, without it, unrecoverable: an activity deleted in error might carry years of transactions, results, and documents, and soft deletion converts that catastrophe into a one-click restore. The discipline the pattern demands sits on the engineering side: every query in the system must filter out soft-deleted rows, since any code path that forgets quietly leaks "deleted" data back into totals, and conversely the Data Clinic and analytics must never count records that users believe are gone. One implementation subtlety documented from experience here: not every table uses the same primary-key column (transactions key on `uuid` rather than `id`), so generic restore logic must resolve the correct identifier column per entity rather than assuming uniformity.',
  },
  {
    id: 'bulk-import',
    term: 'Bulk Import',
    category: 'Data Quality & Tools',
    simple: 'Loading many activities or transactions at once from a file instead of entering them one by one.',
    detailed:
      'Bulk import is the high-volume entry path: a whole portfolio arrives in one operation, from IATI XML or spreadsheet uploads, instead of record-by-record typing. The pipeline runs in stages: parse the source, validate each prospective record, resolve every reference (matching organisations and contacts against existing records using their respective helper utilities so the same partner or person does not multiply), and write to the database in batches with a per-record fallback when a batch fails, so one bad row costs one row rather than the whole batch. Idempotency comes from identifier matching: re-importing the same file updates existing records instead of duplicating them, which makes import a repeatable synchronisation operation, not a one-shot gamble. Every run ends in an accounting: a results summary of what was created, updated, and skipped, with reasons per skip, because silent partial success is the worst outcome an import can have. Bulk import changes what is feasible (onboarding a major partner\'s decade of activities in a session), but it also concentrates risk, since a mapping error repeats across every row, which is why summaries deserve actual reading and imported batches deserve spot-checking in the Data Clinic afterwards.',
  },
  {
    id: 'duplicate-detection',
    term: 'Duplicate Detection',
    category: 'Data Quality & Tools',
    simple: 'Checks that stop the same activity or organisation from being entered twice.',
    detailed:
      'Duplicate detection is the set of checks preventing the same real-world thing from existing as multiple records. For activities the primary key is the IATI identifier, which exists precisely to make global uniqueness checkable: imports match on it before creating anything, so re-imported activities update rather than multiply. For organisations the problem is harder because the same body arrives under many names ("UNDP", "United Nations Development Programme", a local-language variant), so matching uses IATI organisation identifiers where available and falls back to name similarity, with the organisation-resolution helpers applying the logic consistently across every code path that creates organisations. The stakes are aggregate accuracy: a duplicated activity silently doubles every total it touches, and a duplicated organisation splits one partner\'s portfolio into fragments, deflating its true footprint in every league table and profile, failures that are invisible at record level and only show up as quietly wrong numbers. Detection is strongest at the point of entry, since prevention beats cleanup, but merging tools and Data Clinic review handle the duplicates that slip through, and unlinked organisation names are flagged for exactly this reason.',
  },
  {
    id: 'data-gap',
    term: 'Data Gap',
    category: 'Data Quality & Tools',
    simple: 'A required or important piece of information that is missing from a record.',
    detailed:
      'A data gap is a field a record should have but does not: a transaction with no linked provider organisation, an activity with no sector codes or no dates, a monetary value with no USD conversion, a location-scoped project with no locations. Gaps matter because of how aggregation treats absence: a missing sector does not merely leave one record incomplete, it removes that record\'s money from every sector chart, attributes it to an "Unallocated" bucket at best, and quietly shifts the apparent shape of the whole portfolio. Different gaps damage different views (missing providers erode donor attribution, missing dates break time series, missing USD values deflate totals), so gap analysis is really a map from absent fields to broken analytics. The system\'s response is to make gaps countable and fixable rather than abstract: the Data Clinic quantifies them per organisation and per field, presents them in tables where the fix happens inline, and the Transparency Index turns sustained completeness into a visible score. The honest-bucket convention complements the repair work: where gaps remain, charts show explicit "Not reported" or "Unallocated" segments rather than pretending the data is complete.',
  },
  {
    id: 'autosave',
    term: 'Autosave',
    category: 'Data Quality & Tools',
    simple: 'The editor saves your changes automatically as you type, so you do not lose work.',
    detailed:
      'Autosave is the Activity Editor\'s persistence model: fields save as they change, without an explicit save button standing between the user and the database, so a dropped connection, an expired session, or a closed laptop costs keystrokes rather than a session\'s work. The model fits how activity records are actually maintained, with long-lived records accumulating many small edits across many sessions, where save-button discipline reliably fails. Trust in autosave depends on visibility, which is why each save shows its state explicitly: an in-flight indicator while the write travels, confirmation when it lands, and an unmissable error with retry when it fails, because a failed silent save is worse than no autosave at all. The behaviour has deliberate edges documented from experience in this codebase: titles autosave only on existing activities, so stray keystrokes on the new-activity form cannot create half-formed records, and some multi-part edits (contacts, locations) use compensating rollback so a partial failure does not strand inconsistent fragments. The practical habit for users is simply to glance at the indicator before navigating away from a heavy editing session.',
  },
  {
    id: 'document-link',
    term: 'Document Link',
    category: 'Data Quality & Tools',
    simple: 'A file or web link attached to an activity, such as an evaluation report or project design document.',
    detailed:
      'The IATI `document-link` element attaches documents to an activity (or organisation) record: each link carries a URL, a MIME format, a title, one or more category codes from the DocumentCategory codelist (for example `A02` Objectives / Purpose of activity, `A07` Evaluation, `A09` Memorandum of understanding), and language information. Documents are where the summary data gets its depth: codes and numbers say what an activity is and what it spent, while the design document, the evaluation, and the study explain how and why, so document links are the standard\'s pointer from structured data to full narrative evidence. The category codes are worth entering carefully because they make document collections navigable, letting a user pull, say, every evaluation across a portfolio. On the storage side this system follows a hard-learned rule: files are uploaded to object storage and referenced by URL, never embedded inline in database columns, because inline file data once bloated list payloads here to many megabytes per page. Activity documents also feed the system-wide Library, so a document attached once becomes part of the searchable national knowledge base automatically.',
  },
  {
    id: 'library',
    term: 'Library',
    category: 'Data Quality & Tools',
    simple: 'The central collection of all documents uploaded across the system.',
    detailed:
      'The Library is the system-wide aggregation of every document attached anywhere: project design documents, evaluations, studies, agreements, and reports linked to activities and organisations are assembled into one searchable, filterable collection, organised by document category, organisation, sector, and date. The inversion is the point: attached to a single activity, an evaluation is findable only by someone who already knows which activity to open, while in the Library the same evaluation surfaces for anyone searching its theme, which turns scattered attachments into a national knowledge base. The use case it serves is real and chronic: institutional knowledge in the aid sector lives in documents that famously vanish into individual inboxes and project folders, with each new design exercise paying for studies that already exist somewhere unfindable. A populated Library makes "what has already been written about water in this region" a thirty-second search across every partner\'s contributions at once. Its value compounds with contribution, since each well-categorised upload enriches the shared collection, which is why document attachment with accurate category codes is treated as part of normal record completeness rather than an optional extra.',
  },
  // ─── System & Access ───
  {
    id: 'user-role',
    term: 'User Role',
    category: 'System & Access',
    simple: 'The permission level of your account, which controls what you can see and change.',
    detailed:
      'User roles are the system\'s permission tiers, running from read-only accounts through organisation-level editors to the super user administrators who can manage everything. The role is one half of the access decision; the other half is relationship. Most data in the system is readable by any signed-in user, because an aid information system exists to share information, but writing is scoped: a user can edit an activity when they are a super user, when their organisation is the activity\'s reporting organisation, when they created the record, or when they have been added as a contributor, and organisation-scoped tables follow the same shape (public read, writes gated to the owning organisation or a super user). The same rules are enforced at three layers, in the interface by hiding controls a user cannot use, in the API routes which check permissions before any write and fail closed when checks cannot complete, and in the database\'s row-level security as the final backstop, so permissions hold even against direct API calls. Role assignment is managed by super users in the Admin panel, and the practical principle is least privilege: accounts get the narrowest role that lets them do their actual job.',
  },
  {
    id: 'super-user',
    term: 'Super User',
    category: 'System & Access',
    simple: 'An administrator account that can manage everything in the system.',
    detailed:
      'The super user is the system\'s administrator role: accounts with it bypass organisation scoping and can edit any activity, manage users and their roles, maintain organisations and master data, run validations, and operate the system-wide tools in the Admin panel. Capabilities reserved to super users include the management of global content (FAQ entries, glossary terms, page help), user administration, recycle-bin restoration across organisations, and systems settings, with the restrictions enforced both in the interface and at the API layer through an explicit super-user check on every protected route, so the gate holds against direct calls as well as clicks. The role exists because shared national systems need stewards: someone must be able to merge duplicate organisations across ownership boundaries, fix records whose owning organisation has lost access, arbitrate validation, and curate the reference data every user depends on. The same breadth makes the role sensitive, and ordinary practice applies: keep the set of super users small and known, prefer organisation-scoped roles for routine data work, and treat super-user actions on other organisations\' records as stewardship interventions rather than everyday editing.',
  },
  {
    id: 'workspace',
    term: 'Workspace',
    category: 'System & Access',
    simple: 'Your personalised view of the system, scoped to the organisation you are working for.',
    detailed:
      'The workspace is the organisation-centred home view: where most of the system answers questions about the whole country, the workspace filters the world down to your organisation\'s own portfolio, presenting its activities, finances, and data-quality standing in one place. Its hero cards summarise the portfolio\'s budgets, planned disbursements, and transactions, bucketed by the organisation\'s own default financial year rather than the calendar year, with amounts split proportionally when a period straddles the year boundary, so the figures line up with the fiscal frame the organisation actually plans and reports in. Users who belong to several organisations (a consultant supporting multiple partners, a staff member spanning a ministry and a project unit) switch between them with the workspace organisation switcher, and the entire view re-scopes to the selected organisation. The workspace is where the system\'s data quality becomes self-interested in the best way: the gaps, pending validations, and stale records it surfaces are yours, turning portfolio maintenance from an abstract obligation into a visible to-do list on the page you start your day on.',
  },
  {
    id: 'permissions',
    term: 'Permissions',
    category: 'System & Access',
    simple: 'The detailed rules deciding exactly who can view, create, edit, or delete each kind of record.',
    detailed:
      'Permissions are the fine-grained access rules of the system, computed from the combination of a user\'s role, their organisation memberships, and their per-record relationships (creator of a record, named contributor on an activity). The general shape is open reading and scoped writing: signed-in users can see published data across the system, while creating, editing, and deleting are restricted to those with a legitimate claim on the record, the owning organisation\'s members, the creator, contributors, and super users. Enforcement is deliberately layered three deep. The interface hides or disables controls a user cannot exercise, which is courtesy rather than security; the API routes re-check every write server-side and fail closed, meaning that when a permission check cannot complete the write is refused rather than allowed; and the database\'s row-level security policies re-state the same rules in the storage layer itself, the backstop that holds even if application code has a bug. The layers must agree, and the canonical patterns for organisation-scoped writes are documented and reused across tables, because permission rules that drift apart across tables are how shared systems develop quiet data-integrity holes.',
  },
  {
    id: 'financial-year',
    term: 'Financial Year',
    category: 'System & Access',
    simple: 'The 12-month accounting period an organisation uses, which may not match the calendar year.',
    detailed:
      'A financial year is the twelve-month period an organisation uses for budgeting and accounting, and it frequently is not the calendar year: governments and agencies variously run April to March, July to June, or October to September, and a single aid portfolio routinely spans several such conventions at once, with the host government on one fiscal calendar and major donors on others. The mismatch is a real analytical trap, since "spending in 2026" is a different number depending on whose year is meant, and comparisons that silently mix fiscal frames mislead. This system handles the problem by making the frame explicit and computed: each organisation records its default financial year, and workspace summaries bucket budgets, planned disbursements, and transactions by the viewing organisation\'s own fiscal frame, splitting any period that straddles the year boundary proportionally rather than assigning it wholesale to one side. The result is that an organisation\'s workspace figures line up with its internal management reporting, while country-level analytics elsewhere in the system state their own time basis. The general discipline the concept demands is simply to label the frame: every fiscal figure should say which year-definition it is counted in.',
  },
  {
    id: 'calendar',
    term: 'Calendar',
    category: 'System & Access',
    simple: 'The shared schedule of aid-coordination events, meetings, and deadlines.',
    detailed:
      'The Calendar is the system\'s shared schedule for the aid-coordination community: working-group meetings, reporting and validation deadlines, review missions, launches, and the other events that structure coordination life are published in one place rather than scattered across the inboxes of whoever happened to be invited. It is shared infrastructure in the same sense as the data itself, and the rationale parallels the system\'s data argument: coordination calendars fragmented across organisations produce exactly the collisions and missed deadlines that fragmented data produces in analysis, while a common calendar makes the rhythm of sector coordination visible to everyone including newcomers, for whom "what meets when" is otherwise tribal knowledge. Calendar events are managed through the Admin panel\'s event-management tools, and events can be associated with the working groups they belong to, so a group\'s page shows its own meeting schedule alongside its membership and portfolio. The Calendar complements rather than duplicates activity-level dates: activity dates describe when projects run, while the Calendar describes when the people coordinating those projects convene, two different timelines that both matter to how aid is managed.',
  },
  {
    id: 'build-history',
    term: 'Build History',
    category: 'System & Access',
    simple: 'The changelog of what is new in the application, release by release.',
    detailed:
      'Build History is the application\'s public changelog: a release-by-release record of features added, improvements made, and bugs fixed, with version numbers and dates. It serves the everyday transparency that shared platforms owe their users, since in a system that many organisations depend on, behaviour changes are operationally significant: a chart whose methodology was refined, a form whose validation tightened, or a new tab appearing in the Activity Editor all land in users\' workflows, and the changelog is where such changes are announced and dated. That makes it the first diagnostic stop for a familiar class of question ("this worked differently last week, did something change?"), where checking the recent entries either explains the difference in seconds or rules out a release as the cause. It also functions as the system\'s institutional memory of its own evolution, useful when deciding whether a long-requested capability now exists, and as a record of the development cadence partners can inspect. Build History sits in the Support section of the sidebar alongside the FAQ and this Glossary, the three together forming the system\'s self-documentation.',
  },

  // ─── Analysis & Effectiveness ───
  {
    id: 'country-analytics',
    term: 'Country Analytics',
    category: 'Analysis & Effectiveness',
    simple: 'The dashboard showing the big picture of all aid to the country: totals, trends, and breakdowns.',
    detailed:
      'Country Analytics is the system\'s national-level dashboard, aggregating every published activity into the big picture of aid to the country: total funding over time, breakdowns by donor and by sector, the classification donuts covering flow type, aid type (modality), and tied status, government contribution alongside external resources, and humanitarian-versus-development splits. Every chart follows the system\'s canonical aggregation rules so that figures reconcile across pages: only published, non-deleted activities are counted, values are the stored USD conversions, commitments and disbursements are kept distinct (types `2` and `3` respectively), internal transfers between parts of the same organisation are excluded, and attribution is provider-centric with an explicit unattributed bucket rather than silent guessing. Where data is incomplete the charts say so, with "Not reported" and "Unallocated" segments shown honestly instead of being absorbed into the named categories. Each chart carries its explainer text and calculation notes, so a figure can be traced to its method. The audience is anyone who needs the national picture (government planners, partner economists, analysts, journalists), and its accuracy is the downstream sum of every record-level practice the rest of this glossary describes.',
  },
  {
    id: 'aid-effectiveness',
    term: 'Aid Effectiveness',
    category: 'Analysis & Effectiveness',
    simple: 'How well aid is delivered: whether it uses country systems, is predictable, and is well coordinated.',
    detailed:
      'Aid effectiveness is the body of international commitments about how aid should be delivered, built up through the Paris Declaration (2005), the Accra Agenda for Action (2008), and the Busan Partnership agreement (2011), which established the Global Partnership for Effective Development Co-operation (GPEDC) to carry the agenda forward. The core principles are country ownership of development priorities, alignment of aid with national strategies and use of country systems, harmonisation among providers, a focus on results, and mutual accountability between providers and recipients, with transparency and predictability of funding as cross-cutting obligations. The agenda exists because how aid is delivered changes what it achieves: fragmented, unpredictable, donor-driven aid imposes heavy transaction costs and builds little, while aligned, predictable aid flowing through national systems strengthens the institutions it passes through. The commitments are measurable, and much of the data in this system speaks to them directly: aid type captures use of budget support, disbursement channel captures use of country systems, planned disbursements capture forward predictability, and tied status captures procurement openness. The Aid Effectiveness dashboard assembles such indicators into a portfolio-level scorecard against the agenda.',
  },
  {
    id: 'transparency-index',
    term: 'Transparency Index',
    category: 'Analysis & Effectiveness',
    simple: 'A score for each organisation showing how complete and open its data in the system is.',
    detailed:
      'The Transparency Index is the system\'s organisation-level data-quality score: each organisation is rated on the completeness, timeliness, and detail of its records, assessed across dimensions such as whether activities carry budgets and transactions, sector and policy classifications, dates and locations, documents, and results, and how current the information is kept. The design follows a logic proven internationally by instruments like Publish What You Fund\'s Aid Transparency Index, namely that measured, comparable, published scores change publisher behaviour in a way that exhortation does not: a visible ranking creates constructive peer pressure among partners, gives data managers an internal argument for resourcing reporting, and converts the vague request to "improve your data" into specific, scored components an organisation can work through. The index is deliberately diagnostic rather than merely judgmental, with each organisation able to see exactly which fields and records are pulling its score down, which makes the path to improvement concrete, and the Data Clinic is the natural companion tool for closing the identified gaps. Read alongside the Country Analytics dashboards, the index also tells data consumers how much weight each partner\'s figures can bear.',
  },
  {
    id: 'pooled-fund',
    term: 'Pooled Fund',
    category: 'Analysis & Effectiveness',
    simple: 'A shared pot of money several donors pay into, which then funds many activities.',
    detailed:
      'A pooled fund is a financing arrangement in which several contributors pay into a common pot governed by shared rules, with the pot then financing many activities: multi-partner trust funds administered by the UN or development banks, humanitarian country-based pooled funds, thematic basket funds within a sector, and similar vehicles. In OECD DAC modality terms, contributions to such vehicles are typically classified as basket funds / pooled funding (aid type `B04`), and the rationale is aid-effectiveness itself, since pooling reduces fragmentation, spreads risk, harmonises donor requirements behind one governance arrangement, and can channel resources where individual donors lack presence. The analytical challenge is attribution: money loses its donor identity in the pot, so the question "whose money built this clinic?" has no exact answer beyond each contributor\'s share of the pool, and double counting threatens whenever contributions into the fund and the fund\'s own onward grants are summed in the same total. This system\'s handling is to treat the fund as an organisation in its own right, recording inflows from contributors and outflows to activities as separate flows, which keeps the chain visible and lets analysis count either the contribution side or the allocation side, but never both at once.',
  },
  {
    id: 'working-group',
    term: 'Working Group',
    category: 'Analysis & Effectiveness',
    simple: 'A coordination committee of government and partners focused on one sector or theme.',
    detailed:
      'Working groups, also called sector coordination groups or thematic working groups, are the standing committees through which aid coordination actually happens: a chair (typically the lead ministry, often with a development-partner co-chair) convenes the organisations active in a sector or theme to share information, align plans with national strategy, divide labour, and resolve overlaps. They are the institutional embodiment of the harmonisation and ownership principles of the aid-effectiveness agenda, and most countries with significant external assistance run a structured architecture of them spanning sectors and cross-cutting themes. In this system working groups are records in their own right: each group links to its member organisations and to the activities within its remit, and carries its meeting schedule through the shared Calendar, so a group\'s page assembles its full world (who participates, what is happening in the sector, and when the group convenes) in one place. The link between groups and activity data is the practical payoff in both directions: groups get an evidence base for their discussions that is current rather than assembled by survey before each meeting, and the data system gains a community of sector experts with standing reasons to notice and fix its gaps.',
  },
]

export const GLOSSARY_TERM_COUNT = GLOSSARY_TERMS.length

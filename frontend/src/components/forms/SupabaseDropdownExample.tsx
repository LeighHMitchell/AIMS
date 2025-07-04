"use client";

import React from "react";
import { ActivitySupabaseDropdown } from "./SupabaseDropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Example usage for activity defaults
export function ActivityDefaultsExample({ activityId }: { activityId: string }) {
  // Aid Type options
  const aidTypeOptions = [
    { value: "A01", label: "A01 - General budget support" },
    { value: "A02", label: "A02 - Sector budget support" },
    { value: "B01", label: "B01 - Core support to NGOs" },
    { value: "B02", label: "B02 - Core contributions to multilateral institutions" },
    { value: "B03", label: "B03 - Contributions to specific-purpose programmes" },
    { value: "B04", label: "B04 - Basket funds/pooled funding" },
    { value: "C01", label: "C01 - Project-type interventions" },
    { value: "D01", label: "D01 - Donor country personnel" },
    { value: "D02", label: "D02 - Other technical assistance" },
    { value: "E01", label: "E01 - Scholarships/training in donor country" },
    { value: "E02", label: "E02 - Imputed student costs" },
    { value: "F01", label: "F01 - Debt relief" },
    { value: "G01", label: "G01 - Administrative costs not included elsewhere" },
    { value: "H01", label: "H01 - Development awareness" },
    { value: "H02", label: "H02 - Refugees/asylum seekers in donor countries" },
  ];

  // Finance Type options
  const financeTypeOptions = [
    { value: "110", label: "110 - Grant" },
    { value: "210", label: "210 - Interest subsidy" },
    { value: "310", label: "310 - Capital subscription on deposit basis" },
    { value: "311", label: "311 - Capital subscription on encashment basis" },
    { value: "410", label: "410 - Aid loan excluding debt reorganisation" },
    { value: "411", label: "411 - Investment-related loan to developing country" },
    { value: "412", label: "412 - Loan in a joint venture with the recipient" },
    { value: "413", label: "413 - Loan to national private investor" },
    { value: "414", label: "414 - Loan to national private exporter" },
    { value: "421", label: "421 - Standard loan" },
    { value: "422", label: "422 - Reimbursable grant" },
    { value: "423", label: "423 - Bonds" },
    { value: "424", label: "424 - Asset-backed securities" },
    { value: "425", label: "425 - Other debt securities" },
    { value: "431", label: "431 - Subordinated loan" },
    { value: "432", label: "432 - Preferred equity" },
    { value: "433", label: "433 - Other hybrid instruments" },
    { value: "451", label: "451 - Non-banks guaranteed export credits" },
    { value: "452", label: "452 - Non-banks non-guaranteed portions of guaranteed export credits" },
    { value: "453", label: "453 - Bank export credits" },
    { value: "510", label: "510 - Common equity" },
    { value: "511", label: "511 - Shares in collective investment vehicles" },
    { value: "512", label: "512 - Reinvested earnings" },
    { value: "520", label: "520 - Guarantees/insurance" },
    { value: "610", label: "610 - Debt forgiveness: ODA claims (P)" },
    { value: "611", label: "611 - Debt forgiveness: ODA claims (I)" },
    { value: "612", label: "612 - Debt forgiveness: OOF claims (P)" },
    { value: "613", label: "613 - Debt forgiveness: OOF claims (I)" },
    { value: "614", label: "614 - Debt forgiveness: Private claims (P)" },
    { value: "615", label: "615 - Debt forgiveness: Private claims (I)" },
    { value: "616", label: "616 - Debt forgiveness: OOF claims (DSR)" },
    { value: "617", label: "617 - Debt forgiveness: Private claims (DSR)" },
    { value: "618", label: "618 - Debt forgiveness: Other" },
    { value: "620", label: "620 - Debt rescheduling: ODA claims (P)" },
    { value: "621", label: "621 - Debt rescheduling: ODA claims (I)" },
    { value: "622", label: "622 - Debt rescheduling: OOF claims (P)" },
    { value: "623", label: "623 - Debt rescheduling: OOF claims (I)" },
    { value: "624", label: "624 - Debt rescheduling: Private claims (P)" },
    { value: "625", label: "625 - Debt rescheduling: Private claims (I)" },
    { value: "626", label: "626 - Debt rescheduling: OOF claims (DSR)" },
    { value: "627", label: "627 - Debt rescheduling: Private claims (DSR)" },
    { value: "630", label: "630 - Debt rescheduling: OOF claim (DSR – original loan principal)" },
    { value: "631", label: "631 - Debt rescheduling: OOF claim (DSR – original loan interest)" },
    { value: "632", label: "632 - Debt rescheduling: Private claim (DSR – original loan principal)" },
    { value: "633", label: "633 - Debt forgiveness/conversion: export credit claims (P)" },
    { value: "634", label: "634 - Debt forgiveness/conversion: export credit claims (I)" },
    { value: "635", label: "635 - Debt forgiveness: export credit claims (DSR)" },
    { value: "636", label: "636 - Debt rescheduling: export credit claims (P)" },
    { value: "637", label: "637 - Debt rescheduling: export credit claims (I)" },
    { value: "638", label: "638 - Debt rescheduling: export credit claims (DSR)" },
    { value: "639", label: "639 - Debt swap: ODA claims (P)" },
    { value: "640", label: "640 - Debt swap: ODA claims (I)" },
    { value: "641", label: "641 - Debt swap: OOF claims (P)" },
    { value: "642", label: "642 - Debt swap: OOF claims (I)" },
    { value: "643", label: "643 - Debt swap: Private claims (P)" },
    { value: "644", label: "644 - Debt swap: Private claims (I)" },
    { value: "645", label: "645 - Debt swap: Other" },
    { value: "710", label: "710 - Foreign direct investment" },
    { value: "711", label: "711 - Other foreign direct investment, including reinvested earnings" },
    { value: "810", label: "810 - Bank bonds" },
    { value: "811", label: "811 - Non-bank bonds" },
    { value: "910", label: "910 - Other securities/claims" },
    { value: "1100", label: "1100 - Guarantees/insurance" },
  ];

  // Flow Type options
  const flowTypeOptions = [
    { value: "10", label: "10 - ODA" },
    { value: "20", label: "20 - OOF" },
    { value: "21", label: "21 - Non-export credit OOF" },
    { value: "22", label: "22 - Officially supported export credits" },
    { value: "30", label: "30 - Private grants" },
    { value: "35", label: "35 - Private market" },
    { value: "36", label: "36 - Private Foreign Direct Investment" },
    { value: "37", label: "37 - Other Private flows at market terms" },
    { value: "40", label: "40 - Non flow" },
    { value: "50", label: "50 - Other flows" },
  ];

  // Currency options (simplified for example)
  const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "JPY", label: "JPY - Japanese Yen" },
    { value: "CAD", label: "CAD - Canadian Dollar" },
    { value: "AUD", label: "AUD - Australian Dollar" },
    { value: "CHF", label: "CHF - Swiss Franc" },
    { value: "CNY", label: "CNY - Chinese Yuan" },
    { value: "SEK", label: "SEK - Swedish Krona" },
    { value: "NZD", label: "NZD - New Zealand Dollar" },
  ];

  // Tied Status options
  const tiedStatusOptions = [
    { value: "3", label: "3 - Partially tied" },
    { value: "4", label: "4 - Tied" },
    { value: "5", label: "5 - Untied" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Defaults</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <ActivitySupabaseDropdown
          activityId={activityId}
          column="default_aid_type"
          options={aidTypeOptions}
          label="Default Aid Type"
          tooltip="The default type of aid for transactions in this activity"
          placeholder="Select default aid type"
        />

        <ActivitySupabaseDropdown
          activityId={activityId}
          column="default_finance_type"
          options={financeTypeOptions}
          label="Default Finance Type"
          tooltip="The default financial instrument for transactions"
          placeholder="Select default finance type"
        />

        <ActivitySupabaseDropdown
          activityId={activityId}
          column="default_flow_type"
          options={flowTypeOptions}
          label="Default Flow Type"
          tooltip="The default flow type for transactions"
          placeholder="Select default flow type"
        />

        <ActivitySupabaseDropdown
          activityId={activityId}
          column="default_currency"
          options={currencyOptions}
          label="Default Currency"
          tooltip="The default currency for all monetary values"
          placeholder="Select default currency"
        />

        <ActivitySupabaseDropdown
          activityId={activityId}
          column="default_tied_status"
          options={tiedStatusOptions}
          label="Default Tied Status"
          tooltip="Indicates whether aid is tied, partially tied, or untied"
          placeholder="Select default tied status"
        />
      </CardContent>
    </Card>
  );
} 
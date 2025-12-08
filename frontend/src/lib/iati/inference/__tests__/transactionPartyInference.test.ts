/**
 * Tests for IATI Transaction Party Inference
 * 
 * These tests verify the inference logic follows IATI v2.03 rules correctly.
 */

import {
  inferTransactionParties,
  IATI_ROLE,
  ReportingOrg,
  ParticipatingOrg,
  isIncomingTransaction,
  isOutgoingTransaction,
  INCOMING_TRANSACTION_TYPES,
  OUTGOING_TRANSACTION_TYPES,
} from '../index';

describe('inferTransactionParties', () => {
  // ============================================================================
  // Test Fixtures
  // ============================================================================

  // Australia as reporting org
  const australiaReportingOrg: ReportingOrg = {
    ref: 'AU-5',
    organization_id: 'uuid-australia',
    name: 'Australia',
  };

  // UNICEF as implementing org
  const unicefImplementing: ParticipatingOrg = {
    organization_id: 'uuid-unicef',
    iati_role_code: IATI_ROLE.IMPLEMENTING,
    iati_org_ref: 'XM-DAC-41122',
    name: 'UNICEF',
  };

  // Australia as funding org
  const australiaFunding: ParticipatingOrg = {
    organization_id: 'uuid-australia',
    iati_role_code: IATI_ROLE.FUNDING,
    iati_org_ref: 'AU-5',
    name: 'Australia',
  };

  // ============================================================================
  // Example Scenario from Specification
  // ============================================================================

  describe('Example scenario: Australia + UNICEF disbursement', () => {
    it('should infer Australia as provider and UNICEF as receiver for outgoing transaction', () => {
      const result = inferTransactionParties({
        reportingOrg: australiaReportingOrg,
        participatingOrgs: [australiaFunding, unicefImplementing],
        transaction: {
          transactionType: '3', // Disbursement
        },
      });

      expect(result.provider.value).toBe('uuid-australia');
      expect(result.provider.status).toBe('inferred');
      expect(result.provider.name).toBe('Australia');
      expect(result.provider.iatiRef).toBe('AU-5');

      expect(result.receiver.value).toBe('uuid-unicef');
      expect(result.receiver.status).toBe('inferred');
      expect(result.receiver.name).toBe('UNICEF');
      expect(result.receiver.iatiRef).toBe('XM-DAC-41122');
    });
  });

  // ============================================================================
  // Outgoing Transaction Tests
  // ============================================================================

  describe('Outgoing transactions', () => {
    describe('Provider inference', () => {
      it('should return exact status when provider already present', () => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing],
          transaction: {
            transactionType: '3',
            providerOrgId: 'existing-provider-uuid',
            providerOrgRef: 'EXISTING-REF',
          },
        });

        expect(result.provider.value).toBe('existing-provider-uuid');
        expect(result.provider.status).toBe('exact');
        expect(result.provider.iatiRef).toBe('EXISTING-REF');
      });

      it('should infer reporting org as provider when missing', () => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing],
          transaction: {
            transactionType: '2', // Outgoing Commitment
          },
        });

        expect(result.provider.value).toBe('uuid-australia');
        expect(result.provider.status).toBe('inferred');
      });
    });

    describe('Receiver inference', () => {
      it('should return exact status when receiver already present', () => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing],
          transaction: {
            transactionType: '3',
            receiverOrgId: 'existing-receiver-uuid',
            receiverOrgRef: 'EXISTING-RECEIVER-REF',
          },
        });

        expect(result.receiver.value).toBe('existing-receiver-uuid');
        expect(result.receiver.status).toBe('exact');
      });

      it('should infer single implementing org as receiver', () => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing],
          transaction: {
            transactionType: '4', // Expenditure
          },
        });

        expect(result.receiver.value).toBe('uuid-unicef');
        expect(result.receiver.status).toBe('inferred');
      });

      it('should infer accountable org as receiver when no implementing orgs', () => {
        const accountableOrg: ParticipatingOrg = {
          organization_id: 'uuid-accountable',
          iati_role_code: IATI_ROLE.ACCOUNTABLE,
          iati_org_ref: 'ACC-123',
          name: 'Accountable Org',
        };

        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, accountableOrg],
          transaction: { transactionType: '2' },
        });

        expect(result.receiver.value).toBe('uuid-accountable');
        expect(result.receiver.status).toBe('inferred');
      });

      it('should infer single non-reporting org as receiver when no implementing or accountable', () => {
        const extendingOrg: ParticipatingOrg = {
          organization_id: 'uuid-extending',
          iati_role_code: IATI_ROLE.EXTENDING,
          iati_org_ref: 'EXT-456',
          name: 'Extending Partner',
        };

        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, extendingOrg],
          transaction: { transactionType: '4' },
        });

        expect(result.receiver.value).toBe('uuid-extending');
        expect(result.receiver.status).toBe('inferred');
      });

      it('should return ambiguous when multiple implementing orgs exist', () => {
        const unicef2: ParticipatingOrg = {
          organization_id: 'uuid-unicef-2',
          iati_role_code: IATI_ROLE.IMPLEMENTING,
          iati_org_ref: 'XM-DAC-41123',
          name: 'UNICEF Country Office',
        };

        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing, unicef2],
          transaction: { transactionType: '3' },
        });

        expect(result.receiver.value).toBeNull();
        expect(result.receiver.status).toBe('ambiguous');
      });

      it('should return ambiguous when multiple non-reporting orgs and no clear role', () => {
        const org1: ParticipatingOrg = {
          organization_id: 'uuid-1',
          iati_role_code: IATI_ROLE.EXTENDING,
          iati_org_ref: 'ORG-1',
          name: 'Org 1',
        };
        const org2: ParticipatingOrg = {
          organization_id: 'uuid-2',
          iati_role_code: IATI_ROLE.EXTENDING,
          iati_org_ref: 'ORG-2',
          name: 'Org 2',
        };

        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, org1, org2],
          transaction: { transactionType: '3' },
        });

        expect(result.receiver.value).toBeNull();
        expect(result.receiver.status).toBe('ambiguous');
      });
    });
  });

  // ============================================================================
  // Incoming Transaction Tests
  // ============================================================================

  describe('Incoming transactions', () => {
    describe('Receiver inference', () => {
      it('should infer reporting org as receiver for incoming funds', () => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing],
          transaction: { transactionType: '12' }, // Incoming Funds
        });

        expect(result.receiver.value).toBe('uuid-australia');
        expect(result.receiver.status).toBe('inferred');
        expect(result.receiver.iatiRef).toBe('AU-5');
      });

      it('should infer reporting org as receiver for incoming commitment', () => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing],
          transaction: { transactionType: '1' }, // Incoming Commitment
        });

        expect(result.receiver.value).toBe('uuid-australia');
        expect(result.receiver.status).toBe('inferred');
      });

      it('should return exact when receiver already present', () => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding],
          transaction: {
            transactionType: '12',
            receiverOrgId: 'existing-receiver',
          },
        });

        expect(result.receiver.value).toBe('existing-receiver');
        expect(result.receiver.status).toBe('exact');
      });
    });

    describe('Provider inference', () => {
      it('should infer single funding org as provider', () => {
        const externalFunder: ParticipatingOrg = {
          organization_id: 'uuid-funder',
          iati_role_code: IATI_ROLE.FUNDING,
          iati_org_ref: 'FUND-789',
          name: 'External Funder',
        };

        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [externalFunder, unicefImplementing],
          transaction: { transactionType: '1' }, // Incoming Commitment
        });

        expect(result.provider.value).toBe('uuid-funder');
        expect(result.provider.status).toBe('inferred');
        expect(result.provider.name).toBe('External Funder');
      });

      it('should infer extending org as provider when no funding orgs', () => {
        const extendingOrg: ParticipatingOrg = {
          organization_id: 'uuid-extending',
          iati_role_code: IATI_ROLE.EXTENDING,
          iati_org_ref: 'EXT-456',
          name: 'Extending Partner',
        };

        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [extendingOrg, unicefImplementing],
          transaction: { transactionType: '12' },
        });

        expect(result.provider.value).toBe('uuid-extending');
        expect(result.provider.status).toBe('inferred');
      });

      it('should return ambiguous when multiple funding orgs exist', () => {
        const funder1: ParticipatingOrg = {
          organization_id: 'uuid-funder-1',
          iati_role_code: IATI_ROLE.FUNDING,
          iati_org_ref: 'FUND-1',
          name: 'Funder 1',
        };
        const funder2: ParticipatingOrg = {
          organization_id: 'uuid-funder-2',
          iati_role_code: IATI_ROLE.FUNDING,
          iati_org_ref: 'FUND-2',
          name: 'Funder 2',
        };

        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [funder1, funder2, unicefImplementing],
          transaction: { transactionType: '12' },
        });

        expect(result.provider.value).toBeNull();
        expect(result.provider.status).toBe('ambiguous');
      });

      it('should return exact when provider already present', () => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding],
          transaction: {
            transactionType: '12',
            providerOrgId: 'existing-provider',
            providerOrgRef: 'EXISTING-PROV-REF',
          },
        });

        expect(result.provider.value).toBe('existing-provider');
        expect(result.provider.status).toBe('exact');
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle empty participating orgs', () => {
      const result = inferTransactionParties({
        reportingOrg: australiaReportingOrg,
        participatingOrgs: [],
        transaction: { transactionType: '3' },
      });

      // Provider should still be inferred (reporting org)
      expect(result.provider.value).toBe('uuid-australia');
      expect(result.provider.status).toBe('inferred');

      // Receiver is ambiguous (no orgs to choose from)
      expect(result.receiver.value).toBeNull();
      expect(result.receiver.status).toBe('ambiguous');
    });

    it('should handle reporting org without organization_id', () => {
      const reportingOrgNoUuid: ReportingOrg = {
        ref: 'AU-5',
        name: 'Australia',
        // No organization_id
      };

      const result = inferTransactionParties({
        reportingOrg: reportingOrgNoUuid,
        participatingOrgs: [unicefImplementing],
        transaction: { transactionType: '3' },
      });

      // Provider inferred but value is null (no UUID available)
      expect(result.provider.value).toBeNull();
      expect(result.provider.status).toBe('inferred');
      expect(result.provider.iatiRef).toBe('AU-5');
    });

    it('should handle participating org without iati_org_ref', () => {
      const orgNoRef: ParticipatingOrg = {
        organization_id: 'uuid-no-ref',
        iati_role_code: IATI_ROLE.IMPLEMENTING,
        // No iati_org_ref
        name: 'Org Without Ref',
      };

      const result = inferTransactionParties({
        reportingOrg: australiaReportingOrg,
        participatingOrgs: [australiaFunding, orgNoRef],
        transaction: { transactionType: '3' },
      });

      expect(result.receiver.value).toBe('uuid-no-ref');
      expect(result.receiver.status).toBe('inferred');
      expect(result.receiver.iatiRef).toBeNull();
    });

    it('should match reporting org to participating org via iati_org_ref', () => {
      // Only the reporting org as a participating org
      const result = inferTransactionParties({
        reportingOrg: australiaReportingOrg,
        participatingOrgs: [australiaFunding], // Only Australia
        transaction: { transactionType: '3' },
      });

      // Receiver should be ambiguous (only org is the reporting org itself)
      expect(result.receiver.value).toBeNull();
      expect(result.receiver.status).toBe('ambiguous');
    });

    it('should handle all outgoing transaction types correctly', () => {
      const outgoingTypes = ['2', '3', '4', '5', '6', '7', '8', '9', '11', '13'];

      outgoingTypes.forEach((type) => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing],
          transaction: { transactionType: type },
        });

        // For outgoing, provider should be reporting org
        expect(result.provider.iatiRef).toBe('AU-5');
        expect(result.provider.status).toBe('inferred');
      });
    });

    it('should handle all incoming transaction types correctly', () => {
      const incomingTypes = ['1', '12'];

      incomingTypes.forEach((type) => {
        const result = inferTransactionParties({
          reportingOrg: australiaReportingOrg,
          participatingOrgs: [australiaFunding, unicefImplementing],
          transaction: { transactionType: type },
        });

        // For incoming, receiver should be reporting org
        expect(result.receiver.iatiRef).toBe('AU-5');
        expect(result.receiver.status).toBe('inferred');
      });
    });
  });

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe('Helper functions', () => {
    describe('isIncomingTransaction', () => {
      it('should return true for incoming types', () => {
        expect(isIncomingTransaction('1')).toBe(true);
        expect(isIncomingTransaction('12')).toBe(true);
      });

      it('should return false for outgoing types', () => {
        expect(isIncomingTransaction('2')).toBe(false);
        expect(isIncomingTransaction('3')).toBe(false);
        expect(isIncomingTransaction('4')).toBe(false);
      });
    });

    describe('isOutgoingTransaction', () => {
      it('should return true for outgoing types', () => {
        expect(isOutgoingTransaction('2')).toBe(true);
        expect(isOutgoingTransaction('3')).toBe(true);
        expect(isOutgoingTransaction('4')).toBe(true);
      });

      it('should return false for incoming types', () => {
        expect(isOutgoingTransaction('1')).toBe(false);
        expect(isOutgoingTransaction('12')).toBe(false);
      });
    });

    describe('Transaction type sets', () => {
      it('INCOMING_TRANSACTION_TYPES should contain correct types', () => {
        expect(INCOMING_TRANSACTION_TYPES.has('1')).toBe(true);
        expect(INCOMING_TRANSACTION_TYPES.has('12')).toBe(true);
        expect(INCOMING_TRANSACTION_TYPES.size).toBe(2);
      });

      it('OUTGOING_TRANSACTION_TYPES should contain correct types', () => {
        expect(OUTGOING_TRANSACTION_TYPES.has('2')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('3')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('4')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('5')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('6')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('7')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('8')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('9')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('11')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.has('13')).toBe(true);
        expect(OUTGOING_TRANSACTION_TYPES.size).toBe(10);
      });
    });
  });

  // ============================================================================
  // IATI Role Code Tests
  // ============================================================================

  describe('IATI_ROLE constants', () => {
    it('should have correct role codes', () => {
      expect(IATI_ROLE.FUNDING).toBe(1);
      expect(IATI_ROLE.ACCOUNTABLE).toBe(2);
      expect(IATI_ROLE.EXTENDING).toBe(3);
      expect(IATI_ROLE.IMPLEMENTING).toBe(4);
    });
  });
});

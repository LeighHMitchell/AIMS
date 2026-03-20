import { describe, it, expect } from 'vitest';
import {
  isGovernmentUser,
  isActivityCreator,
  isActivityContributor,
  getActivityPermissions,
  canEditTransaction,
  canViewContribution,
  isFocalPoint,
  canHandoffFocalPoint,
  hasPendingHandoff,
  canAssignFocalPoints,
  canRemoveFocalPoint,
  getFocalPointPermissions,
  Activity,
} from '@/lib/activity-permissions';
import { User, USER_ROLES } from '@/types/user';
import { FocalPoint } from '@/types/focal-points';

// ============================================
// Test Fixtures
// ============================================

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: USER_ROLES.DEV_PARTNER_TIER_1,
    organizationId: 'org-1',
    ...overrides,
  } as User;
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    submissionStatus: 'draft',
    createdByOrg: 'org-1',
    createdBy: { id: 'user-1', name: 'Creator', role: USER_ROLES.DEV_PARTNER_TIER_1 },
    contributors: [],
    ...overrides,
  };
}

function makeFocalPoint(overrides: Partial<FocalPoint> = {}): FocalPoint {
  return {
    id: 'fp-1',
    name: 'Focal Person',
    email: 'focal@example.com',
    type: 'government_focal_point',
    status: 'assigned',
    ...overrides,
  };
}

// ============================================
// isGovernmentUser
// ============================================

describe('isGovernmentUser', () => {
  it('returns true for GOV_PARTNER_TIER_1', () => {
    expect(isGovernmentUser(makeUser({ role: USER_ROLES.GOV_PARTNER_TIER_1 }))).toBe(true);
  });

  it('returns true for GOV_PARTNER_TIER_2', () => {
    expect(isGovernmentUser(makeUser({ role: USER_ROLES.GOV_PARTNER_TIER_2 }))).toBe(true);
  });

  it('returns true for SUPER_USER', () => {
    expect(isGovernmentUser(makeUser({ role: USER_ROLES.SUPER_USER }))).toBe(true);
  });

  it('returns false for DEV_PARTNER_TIER_1', () => {
    expect(isGovernmentUser(makeUser({ role: USER_ROLES.DEV_PARTNER_TIER_1 }))).toBe(false);
  });

  it('returns false for DEV_PARTNER_TIER_2', () => {
    expect(isGovernmentUser(makeUser({ role: USER_ROLES.DEV_PARTNER_TIER_2 }))).toBe(false);
  });

  it('returns false for PUBLIC_USER', () => {
    expect(isGovernmentUser(makeUser({ role: USER_ROLES.PUBLIC_USER }))).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isGovernmentUser(null)).toBe(false);
  });
});

// ============================================
// isActivityCreator
// ============================================

describe('isActivityCreator', () => {
  it('returns true when user.id matches activity.createdBy.id', () => {
    const user = makeUser({ id: 'user-1' });
    const activity = makeActivity({ createdBy: { id: 'user-1', name: 'Test', role: 'dev_partner_tier_1' } });
    expect(isActivityCreator(user, activity)).toBe(true);
  });

  it('returns false when IDs do not match', () => {
    const user = makeUser({ id: 'user-2' });
    const activity = makeActivity({ createdBy: { id: 'user-1', name: 'Test', role: 'dev_partner_tier_1' } });
    expect(isActivityCreator(user, activity)).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isActivityCreator(null, makeActivity())).toBe(false);
  });

  it('returns false when activity has no createdBy', () => {
    const user = makeUser();
    const activity = makeActivity({ createdBy: undefined });
    expect(isActivityCreator(user, activity)).toBe(false);
  });
});

// ============================================
// isActivityContributor
// ============================================

describe('isActivityContributor', () => {
  it('returns true when user org matches accepted contributor', () => {
    const user = makeUser({ organizationId: 'org-A' });
    const activity = makeActivity({
      contributors: [{
        id: 'c-1', organizationId: 'org-A', organizationName: 'Org A',
        status: 'accepted', role: 'funder', nominatedBy: 'x', nominatedByName: 'X',
        nominatedAt: '2024-01-01', canEditOwnData: true, canViewOtherDrafts: false,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      }],
    });
    expect(isActivityContributor(user, activity)).toBe(true);
  });

  it('returns false when contributor status is nominated (not accepted)', () => {
    const user = makeUser({ organizationId: 'org-A' });
    const activity = makeActivity({
      contributors: [{
        id: 'c-1', organizationId: 'org-A', organizationName: 'Org A',
        status: 'nominated', role: 'funder', nominatedBy: 'x', nominatedByName: 'X',
        nominatedAt: '2024-01-01', canEditOwnData: true, canViewOtherDrafts: false,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      }],
    });
    expect(isActivityContributor(user, activity)).toBe(false);
  });

  it('returns false when org does not match any contributor', () => {
    const user = makeUser({ organizationId: 'org-B' });
    const activity = makeActivity({
      contributors: [{
        id: 'c-1', organizationId: 'org-A', organizationName: 'Org A',
        status: 'accepted', role: 'funder', nominatedBy: 'x', nominatedByName: 'X',
        nominatedAt: '2024-01-01', canEditOwnData: true, canViewOtherDrafts: false,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      }],
    });
    expect(isActivityContributor(user, activity)).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isActivityContributor(null, makeActivity())).toBe(false);
  });

  it('returns false when user has no organizationId', () => {
    const user = makeUser({ organizationId: undefined });
    expect(isActivityContributor(user, makeActivity())).toBe(false);
  });

  it('returns false when activity has no contributors', () => {
    const user = makeUser();
    const activity = makeActivity({ contributors: undefined });
    expect(isActivityContributor(user, activity)).toBe(false);
  });
});

// ============================================
// getActivityPermissions
// ============================================

describe('getActivityPermissions', () => {
  it('returns all-false permissions for null user', () => {
    const perms = getActivityPermissions(null, makeActivity());
    expect(perms.canEditActivity).toBe(false);
    expect(perms.canValidateActivity).toBe(false);
    expect(perms.canRejectActivity).toBe(false);
    expect(perms.canNominateContributors).toBe(false);
    expect(perms.canEditOwnContributions).toBe(false);
    expect(perms.canViewOtherContributions).toBe(false);
    expect(perms.canEditOtherContributions).toBe(false);
    expect(perms.canRequestToJoin).toBe(false);
    expect(perms.canApproveJoinRequests).toBe(false);
  });

  describe('super user', () => {
    const superUser = makeUser({ role: USER_ROLES.SUPER_USER });

    it('can edit any activity', () => {
      expect(getActivityPermissions(superUser, makeActivity()).canEditActivity).toBe(true);
    });

    it('can edit other contributions', () => {
      expect(getActivityPermissions(superUser, makeActivity()).canEditOtherContributions).toBe(true);
    });

    it('can nominate contributors', () => {
      expect(getActivityPermissions(superUser, makeActivity()).canNominateContributors).toBe(true);
    });

    it('can approve join requests', () => {
      expect(getActivityPermissions(superUser, makeActivity()).canApproveJoinRequests).toBe(true);
    });

    it('can view other contributions', () => {
      expect(getActivityPermissions(superUser, makeActivity()).canViewOtherContributions).toBe(true);
    });
  });

  describe('activity creator (dev partner)', () => {
    const creator = makeUser({ id: 'user-1', role: USER_ROLES.DEV_PARTNER_TIER_1 });
    const activity = makeActivity({ createdBy: { id: 'user-1', name: 'Creator', role: 'dev_partner_tier_1' } });

    it('can edit their own activity', () => {
      expect(getActivityPermissions(creator, activity).canEditActivity).toBe(true);
    });

    it('can nominate contributors', () => {
      expect(getActivityPermissions(creator, activity).canNominateContributors).toBe(true);
    });

    it('can edit own contributions when not validated', () => {
      expect(getActivityPermissions(creator, activity).canEditOwnContributions).toBe(true);
    });

    it('cannot edit own contributions on validated activities', () => {
      const validated = makeActivity({ ...activity, submissionStatus: 'validated' });
      expect(getActivityPermissions(creator, validated).canEditOwnContributions).toBe(false);
    });

    it('cannot validate their own activity', () => {
      expect(getActivityPermissions(creator, activity).canValidateActivity).toBe(false);
    });

    it('cannot request to join (already creator)', () => {
      expect(getActivityPermissions(creator, activity).canRequestToJoin).toBe(false);
    });
  });

  describe('government user', () => {
    const govUser = makeUser({ id: 'gov-user', role: USER_ROLES.GOV_PARTNER_TIER_1, organizationId: 'gov-org' });

    it('can edit draft activities', () => {
      const activity = makeActivity({ submissionStatus: 'draft', createdBy: { id: 'other', name: 'Other', role: 'dev_partner_tier_1' } });
      expect(getActivityPermissions(govUser, activity).canEditActivity).toBe(true);
    });

    it('cannot edit submitted activities (unless super user)', () => {
      const activity = makeActivity({ submissionStatus: 'submitted', createdBy: { id: 'other', name: 'Other', role: 'dev_partner_tier_1' } });
      expect(getActivityPermissions(govUser, activity).canEditActivity).toBe(false);
    });

    it('can validate submitted activities', () => {
      const activity = makeActivity({ submissionStatus: 'submitted', createdBy: { id: 'other', name: 'Other', role: 'dev_partner_tier_1' } });
      expect(getActivityPermissions(govUser, activity).canValidateActivity).toBe(true);
    });

    it('can reject submitted activities', () => {
      const activity = makeActivity({ submissionStatus: 'submitted', createdBy: { id: 'other', name: 'Other', role: 'dev_partner_tier_1' } });
      expect(getActivityPermissions(govUser, activity).canRejectActivity).toBe(true);
    });

    it('cannot validate draft activities', () => {
      const activity = makeActivity({ submissionStatus: 'draft', createdBy: { id: 'other', name: 'Other', role: 'dev_partner_tier_1' } });
      expect(getActivityPermissions(govUser, activity).canValidateActivity).toBe(false);
    });

    it('can view other contributions', () => {
      const activity = makeActivity({ createdBy: { id: 'other', name: 'Other', role: 'dev_partner_tier_1' } });
      expect(getActivityPermissions(govUser, activity).canViewOtherContributions).toBe(true);
    });

    it('can approve join requests', () => {
      const activity = makeActivity({ createdBy: { id: 'other', name: 'Other', role: 'dev_partner_tier_1' } });
      expect(getActivityPermissions(govUser, activity).canApproveJoinRequests).toBe(true);
    });
  });

  describe('non-contributor dev partner', () => {
    const outsider = makeUser({ id: 'outsider', organizationId: 'org-other', role: USER_ROLES.DEV_PARTNER_TIER_2 });
    const activity = makeActivity({ createdBy: { id: 'someone-else', name: 'Other', role: 'dev_partner_tier_1' } });

    it('cannot edit activity', () => {
      expect(getActivityPermissions(outsider, activity).canEditActivity).toBe(false);
    });

    it('cannot view other contributions', () => {
      expect(getActivityPermissions(outsider, activity).canViewOtherContributions).toBe(false);
    });

    it('can request to join', () => {
      expect(getActivityPermissions(outsider, activity).canRequestToJoin).toBe(true);
    });

    it('cannot edit other contributions', () => {
      expect(getActivityPermissions(outsider, activity).canEditOtherContributions).toBe(false);
    });
  });
});

// ============================================
// canEditTransaction
// ============================================

describe('canEditTransaction', () => {
  it('super user can edit any transaction', () => {
    const superUser = makeUser({ role: USER_ROLES.SUPER_USER, organizationId: 'org-A' });
    const activity = makeActivity();
    expect(canEditTransaction(superUser, 'org-B', activity)).toBe(true);
  });

  it('creator can edit own org transactions', () => {
    const creator = makeUser({ id: 'user-1', organizationId: 'org-A' });
    const activity = makeActivity({ createdBy: { id: 'user-1', name: 'Creator', role: 'dev_partner_tier_1' } });
    expect(canEditTransaction(creator, 'org-A', activity)).toBe(true);
  });

  it('creator cannot edit other org transactions', () => {
    const creator = makeUser({ id: 'user-1', organizationId: 'org-A' });
    const activity = makeActivity({ createdBy: { id: 'user-1', name: 'Creator', role: 'dev_partner_tier_1' } });
    expect(canEditTransaction(creator, 'org-B', activity)).toBe(false);
  });

  it('returns false for null user', () => {
    expect(canEditTransaction(null, 'org-A', makeActivity())).toBe(false);
  });

  it('returns false for user with no organizationId', () => {
    const user = makeUser({ organizationId: undefined });
    expect(canEditTransaction(user, 'org-A', makeActivity())).toBe(false);
  });
});

// ============================================
// canViewContribution
// ============================================

describe('canViewContribution', () => {
  it('super user can view any contribution', () => {
    const superUser = makeUser({ role: USER_ROLES.SUPER_USER });
    expect(canViewContribution(superUser, 'org-B', makeActivity())).toBe(true);
  });

  it('gov user can view any contribution', () => {
    const govUser = makeUser({ role: USER_ROLES.GOV_PARTNER_TIER_1, id: 'gov-user' });
    const activity = makeActivity({ createdBy: { id: 'other', name: 'Other', role: 'dev_partner_tier_1' } });
    expect(canViewContribution(govUser, 'org-B', activity)).toBe(true);
  });

  it('regular user can view own org contributions', () => {
    const user = makeUser({ id: 'outsider', organizationId: 'org-A', role: USER_ROLES.DEV_PARTNER_TIER_2 });
    const activity = makeActivity({ createdBy: { id: 'someone-else', name: 'Other', role: 'dev_partner_tier_1' } });
    expect(canViewContribution(user, 'org-A', activity)).toBe(true);
  });

  it('regular user cannot view other org contributions', () => {
    const user = makeUser({ id: 'outsider', organizationId: 'org-A', role: USER_ROLES.DEV_PARTNER_TIER_2 });
    const activity = makeActivity({ createdBy: { id: 'someone-else', name: 'Other', role: 'dev_partner_tier_1' } });
    expect(canViewContribution(user, 'org-B', activity)).toBe(false);
  });

  it('returns false for null user', () => {
    expect(canViewContribution(null, 'org-A', makeActivity())).toBe(false);
  });
});

// ============================================
// Focal Point Helpers
// ============================================

describe('isFocalPoint', () => {
  it('matches by email with assigned status', () => {
    const user = makeUser({ email: 'focal@example.com' });
    const fps = [makeFocalPoint({ email: 'focal@example.com', status: 'assigned' })];
    expect(isFocalPoint(user, fps)).toBe(true);
  });

  it('matches by user_id with accepted status', () => {
    const user = makeUser({ id: 'user-1' });
    const fps = [makeFocalPoint({ user_id: 'user-1', status: 'accepted' })];
    expect(isFocalPoint(user, fps)).toBe(true);
  });

  it('does not match pending_handoff status', () => {
    const user = makeUser({ email: 'focal@example.com' });
    const fps = [makeFocalPoint({ email: 'focal@example.com', status: 'pending_handoff' })];
    expect(isFocalPoint(user, fps)).toBe(false);
  });

  it('filters by type when provided', () => {
    const user = makeUser({ email: 'focal@example.com' });
    const fps = [makeFocalPoint({ email: 'focal@example.com', type: 'government_focal_point', status: 'assigned' })];
    expect(isFocalPoint(user, fps, 'government_focal_point')).toBe(true);
    expect(isFocalPoint(user, fps, 'development_partner_focal_point')).toBe(false);
  });

  it('returns false for null user', () => {
    expect(isFocalPoint(null, [makeFocalPoint()])).toBe(false);
  });

  it('returns false for empty focal points list', () => {
    expect(isFocalPoint(makeUser(), [])).toBe(false);
  });
});

describe('canHandoffFocalPoint', () => {
  it('returns true when user is active focal point of matching type', () => {
    const user = makeUser({ email: 'focal@example.com' });
    const fps = [makeFocalPoint({ email: 'focal@example.com', type: 'government_focal_point', status: 'assigned' })];
    expect(canHandoffFocalPoint(user, fps, 'government_focal_point')).toBe(true);
  });

  it('returns false when type does not match', () => {
    const user = makeUser({ email: 'focal@example.com' });
    const fps = [makeFocalPoint({ email: 'focal@example.com', type: 'government_focal_point', status: 'assigned' })];
    expect(canHandoffFocalPoint(user, fps, 'development_partner_focal_point')).toBe(false);
  });

  it('returns false for null user', () => {
    expect(canHandoffFocalPoint(null, [makeFocalPoint()], 'government_focal_point')).toBe(false);
  });
});

describe('hasPendingHandoff', () => {
  it('returns focal point when user has pending handoff', () => {
    const user = makeUser({ id: 'target-user' });
    const fp = makeFocalPoint({ handed_off_to: 'target-user', status: 'pending_handoff' });
    expect(hasPendingHandoff(user, [fp])).toEqual(fp);
  });

  it('filters by type', () => {
    const user = makeUser({ id: 'target-user' });
    const fp = makeFocalPoint({ handed_off_to: 'target-user', status: 'pending_handoff', type: 'government_focal_point' });
    expect(hasPendingHandoff(user, [fp], 'government_focal_point')).toEqual(fp);
    expect(hasPendingHandoff(user, [fp], 'development_partner_focal_point')).toBeNull();
  });

  it('returns null when no pending handoff', () => {
    const user = makeUser({ id: 'other-user' });
    const fp = makeFocalPoint({ handed_off_to: 'target-user', status: 'pending_handoff' });
    expect(hasPendingHandoff(user, [fp])).toBeNull();
  });

  it('returns null for null user', () => {
    expect(hasPendingHandoff(null, [makeFocalPoint()])).toBeNull();
  });
});

describe('canAssignFocalPoints', () => {
  it('returns true for super user', () => {
    expect(canAssignFocalPoints(makeUser({ role: USER_ROLES.SUPER_USER }))).toBe(true);
  });

  it('returns false for gov partner', () => {
    expect(canAssignFocalPoints(makeUser({ role: USER_ROLES.GOV_PARTNER_TIER_1 }))).toBe(false);
  });

  it('returns false for dev partner', () => {
    expect(canAssignFocalPoints(makeUser({ role: USER_ROLES.DEV_PARTNER_TIER_1 }))).toBe(false);
  });

  it('returns false for null user', () => {
    expect(canAssignFocalPoints(null)).toBe(false);
  });
});

describe('canRemoveFocalPoint', () => {
  it('super user can remove any focal point', () => {
    const superUser = makeUser({ role: USER_ROLES.SUPER_USER, email: 'admin@example.com' });
    const fp = makeFocalPoint({ email: 'other@example.com' });
    expect(canRemoveFocalPoint(superUser, fp)).toBe(true);
  });

  it('focal point can remove themselves by email', () => {
    const user = makeUser({ email: 'focal@example.com', role: USER_ROLES.DEV_PARTNER_TIER_1 });
    const fp = makeFocalPoint({ email: 'focal@example.com' });
    expect(canRemoveFocalPoint(user, fp)).toBe(true);
  });

  it('focal point can remove themselves by user_id', () => {
    const user = makeUser({ id: 'user-1', role: USER_ROLES.DEV_PARTNER_TIER_1 });
    const fp = makeFocalPoint({ user_id: 'user-1' });
    expect(canRemoveFocalPoint(user, fp)).toBe(true);
  });

  it('non-super user cannot remove others', () => {
    const user = makeUser({ email: 'me@example.com', id: 'user-2', role: USER_ROLES.DEV_PARTNER_TIER_1 });
    const fp = makeFocalPoint({ email: 'other@example.com', user_id: 'user-1' });
    expect(canRemoveFocalPoint(user, fp)).toBe(false);
  });

  it('returns false for null user', () => {
    expect(canRemoveFocalPoint(null, makeFocalPoint())).toBe(false);
  });
});

describe('getFocalPointPermissions', () => {
  it('returns correct permissions for super user who is a gov focal point', () => {
    const user = makeUser({ role: USER_ROLES.SUPER_USER, email: 'admin@example.com', id: 'admin-1' });
    const fps = [makeFocalPoint({ email: 'admin@example.com', type: 'government_focal_point', status: 'assigned' })];
    const perms = getFocalPointPermissions(user, fps);

    expect(perms.canAssignFocalPoints).toBe(true);
    expect(perms.isGovernmentFocalPoint).toBe(true);
    expect(perms.isDevelopmentPartnerFocalPoint).toBe(false);
    expect(perms.canHandoffGovernmentFocalPoint).toBe(true);
    expect(perms.canHandoffDevelopmentPartnerFocalPoint).toBe(false);
  });

  it('returns correct permissions for null user', () => {
    const perms = getFocalPointPermissions(null, []);
    expect(perms.canAssignFocalPoints).toBe(false);
    expect(perms.isGovernmentFocalPoint).toBe(false);
    expect(perms.isDevelopmentPartnerFocalPoint).toBe(false);
    expect(perms.hasPendingGovernmentHandoff).toBe(false);
    expect(perms.hasPendingDevelopmentPartnerHandoff).toBe(false);
  });
});

export const GDPR = {
  privacyPolicyVersion: "1.0",
  termsVersion: "1.0",
  retention: {
    timeEntriesDays: 365 * 3,
    leaveRecordsDays: 365 * 7,
    tasksDays: 365 * 3,
    deletedUserGraceDays: 30,
  },
} as const;

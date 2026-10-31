import 'dotenv/config';

import {
  mailWelcome,
  mailPendingApproval,
  mailApproved,
  mailPasswordReset,
  mailAdminNewRegistration,
  mailIssueSubmitted,
  mailAdminIssueSubmitted,
  mailIssueResolved,
  mailAnnouncement,
  mailMaintenanceNotice,
  mailBreedingAlert,
  mailLowMilkAlert,
  mailWeeklyReport,
  mailMonthlyOverview,
  mailEmailVerification,
  mailResendVerification,
  mailSecurityAlert,
  mailDailySecuritySummary,
  mailPasswordChanged,
  mailAnimalRegistered,
  mailVetAppointmentConfirmation,
  mailVaccinationReminder,
  mailVetAppointmentReminder,
  mailWorkerInvitation,
  mailMarketNewOffer,
  mailMarketOfferAccepted,
  mailMarketOfferRejected,
  mailMarketCounterOffer,
  mailMarketNewMessage,
  mailMarketListingPublished,
  mailMarketTransferComplete,
  mailMarketTransferCompleteToSeller
} from './src/services/mail.service';

const TO = 'collinsmwendamunene@gmail.com';
const NAME = 'Collins';
const ANIMAL = 'TEST Cow';

const weeklyData = {
  totalAnimals: 25,
  weekMilk: 420.5,
  avgDaily: 60.1,
  healthRecords: 8,
  pregnantCount: 6,
  overdueCount: 1,
  weekIncome: 85000,
  weekExpense: 32000,
  topCow: ANIMAL,
  topCowLiters: 24.5,
  weekStart: '2026-10-01',
  weekEnd: '2026-10-07'
};

const monthlyData = {
  month: 'October 2026',
  totalAnimals: 25,
  monthMilk: 1800.5,
  avgDailyMilk: 60.0,
  healthRecords: 24,
  vaccinations: 8,
  birthsThisMonth: 2,
  pregnantCount: 6,
  monthIncome: 350000,
  monthExpense: 140000,
  topCow: ANIMAL,
  topCowLiters: 25.5,
  newAnimals: 3
};

type Test = {
  name: string;
  run: () => Promise<void>;
};

const tests: Test[] = [
  {
    name: 'mailWelcome',
    run: () => mailWelcome(TO, NAME)
  },
  {
    name: 'mailPendingApproval',
    run: () => mailPendingApproval(TO, NAME)
  },
  {
    name: 'mailApproved',
    run: () => mailApproved(TO, NAME)
  },
  {
    name: 'mailPasswordReset',
    run: () => mailPasswordReset(TO, NAME, 'TEST-RESET-TOKEN-123')
  },
  {
    name: 'mailAdminNewRegistration',
    run: () => mailAdminNewRegistration(NAME, TO, 'FARMER')
  },
  {
    name: 'mailIssueSubmitted',
    run: () => mailIssueSubmitted(TO, NAME, 'TEST Issue', 'MEDIUM')
  },
  {
    name: 'mailAdminIssueSubmitted',
    run: () => mailAdminIssueSubmitted(
      NAME,
      TO,
      'TEST Issue',
      'This is a test issue.',
      'SYSTEM',
      'MEDIUM'
    )
  },
  {
    name: 'mailIssueResolved',
    run: () => mailIssueResolved(
      TO,
      NAME,
      'TEST Issue',
      'RESOLVED',
      'Test resolution note'
    )
  },
  {
    name: 'mailAnnouncement',
    run: () => mailAnnouncement(
      TO,
      NAME,
      'AgriPulse TEST Announcement',
      'This is a test announcement.',
      'INFO'
    )
  },
  {
    name: 'mailMaintenanceNotice',
    run: () => mailMaintenanceNotice(
      TO,
      NAME,
      '2026-10-10 10:00 AM',
      30
    )
  },
  {
    name: 'mailBreedingAlert',
    run: () => mailBreedingAlert(
      ANIMAL,
      'TEST-001',
      'Within 7 days',
      'due7'
    )
  },
  {
    name: 'mailLowMilkAlert',
    run: () => mailLowMilkAlert(ANIMAL, '3.8')
  },
  {
    name: 'mailWeeklyReport',
    run: () => mailWeeklyReport(TO, NAME, weeklyData)
  },
  {
    name: 'mailMonthlyOverview',
    run: () => mailMonthlyOverview(TO, NAME, monthlyData)
  },
  {
    name: 'mailEmailVerification',
    run: () => mailEmailVerification(
      TO,
      NAME,
      'TEST-VERIFY-TOKEN-123'
    )
  },
  {
    name: 'mailResendVerification',
    run: () => mailResendVerification(
      TO,
      NAME,
      'TEST-VERIFY-TOKEN-456'
    )
  },
  {
    name: 'mailSecurityAlert',
    run: () => mailSecurityAlert({
      type: 'TEST',
      title: 'TEST Security Alert',
      message: 'This is a test security alert from AgriPulse.',
      ip: '127.0.0.1',
      details: [
        ['Event Type', 'TEST'],
        ['Severity', 'MEDIUM'],
        ['User', TO]
      ]
    })
  },
  {
    name: 'mailDailySecuritySummary',
    run: () => mailDailySecuritySummary({
      failedLogins: 2,
      successfulLogins: 15,
      newUsers: 1,
      activeUsers: 5,
      topAttackers: '127.0.0.1 — TEST',
      date: new Date().toISOString().slice(0, 10)
    })
  },
  {
    name: 'mailPasswordChanged',
    run: () => mailPasswordChanged(TO, NAME)
  },
  {
    name: 'mailAnimalRegistered',
    run: () => mailAnimalRegistered(
      TO,
      NAME,
      ANIMAL,
      'AP-TEST-001',
      'TAG-TEST-001'
    )
  },
  {
    name: 'mailVetAppointmentConfirmation',
    run: () => mailVetAppointmentConfirmation(
      TO,
      NAME,
      ANIMAL,
      'Dr. Test Vet',
      '2026-10-10',
      '10:00 AM'
    )
  },
  {
    name: 'mailVaccinationReminder',
    run: () => mailVaccinationReminder(
      TO,
      NAME,
      ANIMAL,
      'FMD Vaccine',
      '2026-10-10'
    )
  },
  {
    name: 'mailVetAppointmentReminder',
    run: () => mailVetAppointmentReminder(
      TO,
      NAME,
      ANIMAL,
      '10:00 AM'
    )
  },
  {
    name: 'mailWorkerInvitation',
    run: () => mailWorkerInvitation(
      TO,
      NAME,
      'Test Farm',
      'Test Administrator',
      TO
    )
  },
  {
    name: 'mailMarketNewOffer',
    run: () => mailMarketNewOffer(
      TO,
      NAME,
      'Test Buyer',
      ANIMAL,
      125000,
      1001
    )
  },
  {
    name: 'mailMarketOfferAccepted',
    run: () => mailMarketOfferAccepted(
      TO,
      NAME,
      'Test Seller',
      ANIMAL,
      125000,
      1001
    )
  },
  {
    name: 'mailMarketOfferRejected',
    run: () => mailMarketOfferRejected(
      TO,
      NAME,
      ANIMAL,
      120000
    )
  },
  {
    name: 'mailMarketCounterOffer',
    run: () => mailMarketCounterOffer(
      TO,
      NAME,
      'Test Seller',
      ANIMAL,
      130000,
      1001
    )
  },
  {
    name: 'mailMarketNewMessage',
    run: () => mailMarketNewMessage(
      TO,
      NAME,
      'Test Sender',
      ANIMAL,
      'Hello, this is a test marketplace message.',
      2001
    )
  },
  {
    name: 'mailMarketListingPublished',
    run: () => mailMarketListingPublished(
      TO,
      NAME,
      ANIMAL,
      150000,
      1001
    )
  },
  {
    name: 'mailMarketTransferComplete',
    run: () => mailMarketTransferComplete(
      TO,
      NAME,
      'Test Seller',
      ANIMAL,
      'AP-PASSPORT-TEST-001',
      145000
    )
  },
  {
    name: 'mailMarketTransferCompleteToSeller',
    run: () => mailMarketTransferCompleteToSeller(
      TO,
      NAME,
      'Test Buyer',
      ANIMAL,
      145000
    )
  }
];

async function main() {
  console.log('');
  console.log('========================================');
  console.log('AGRIPULSE 128 EMAIL TEST');
  console.log('32 services × 4 rounds');
  console.log(`Recipient: ${TO}`);
  console.log('========================================');

  let passed = 0;
  let failed = 0;

  for (let round = 1; round <= 4; round++) {
    console.log('');
    console.log(`========== ROUND ${round}/4 ==========`);

    for (const test of tests) {
      try {
        await test.run();
        passed++;
        console.log(`[PASS] Round ${round} — ${test.name}`);
      } catch (err: any) {
        failed++;
        console.error(
          `[FAIL] Round ${round} — ${test.name}`,
          err?.stack || err
        );
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('');
  console.log('========================================');
  console.log(`RESULT: ${passed} PASSED / ${failed} FAILED`);
  console.log('EXPECTED: 128 TOTAL EMAIL TESTS');
  console.log('========================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('TEST RUNNER FAILED:', err);
  process.exitCode = 1;
});

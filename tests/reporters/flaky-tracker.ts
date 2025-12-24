import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

interface FlakyTestInfo {
  title: string;
  file: string;
  attempts: number;
  finalStatus: string;
}

/**
 * Custom Playwright reporter that tracks and logs flaky tests.
 * A test is considered flaky if it required retries to pass.
 *
 * Logs each retry as it happens and provides a summary at the end.
 */
class FlakyTracker implements Reporter {
  private flakyTests: FlakyTestInfo[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    // Log each retry attempt as it happens
    if (result.retry > 0) {
      const status = result.status === 'passed' ? 'PASSED' : result.status.toUpperCase();
      console.log(
        `[FLAKY] ${test.title} - attempt ${result.retry + 1} ${status} (${test.location.file})`
      );

      // Track tests that eventually passed after retries
      if (result.status === 'passed') {
        this.flakyTests.push({
          title: test.title,
          file: test.location.file,
          attempts: result.retry + 1,
          finalStatus: 'passed',
        });
      }
    }
  }

  onEnd(result: FullResult): void {
    if (this.flakyTests.length > 0) {
      console.log('\n=== FLAKY TEST SUMMARY ===');
      console.log(`Total flaky tests: ${this.flakyTests.length}`);
      console.log('');

      for (const test of this.flakyTests) {
        console.log(`  - ${test.title}`);
        console.log(`    File: ${test.file}`);
        console.log(`    Required ${test.attempts} attempts to pass`);
        console.log('');
      }

      console.log('=========================\n');
    }
  }
}

export default FlakyTracker;

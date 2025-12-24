import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

interface FlakyTestInfo {
  title: string;
  file: string;
  attempts: number;
  finalStatus: string;
}

/**
 * Custom Playwright reporter that tracks and logs flaky tests.
 * A test is considered flaky if it required retries, regardless of final outcome.
 *
 * Logs each retry as it happens and provides a summary at the end.
 * Note: console.log is intentional - Playwright reporters output to terminal.
 */
class FlakyTracker implements Reporter {
  private flakyTests: Map<string, FlakyTestInfo> = new Map();

  onTestEnd(test: TestCase, result: TestResult): void {
    // Log each retry attempt as it happens
    if (result.retry > 0) {
      const status = result.status === 'passed' ? 'PASSED' : result.status.toUpperCase();
      console.log(
        `[FLAKY] ${test.title} - attempt ${result.retry + 1} ${status} (${test.location.file})`
      );

      // Track ALL tests that required retries, regardless of final outcome
      // Use Map to deduplicate - final call will have final status
      const key = `${test.location.file}:${test.title}`;
      this.flakyTests.set(key, {
        title: test.title,
        file: test.location.file,
        attempts: result.retry + 1,
        finalStatus: result.status,
      });
    }
  }

  onEnd(result: FullResult): void {
    const tests = Array.from(this.flakyTests.values());
    if (tests.length > 0) {
      console.log('\n=== FLAKY TEST SUMMARY ===');
      console.log(`Total flaky tests: ${tests.length}`);
      console.log('');

      for (const test of tests) {
        const statusIcon = test.finalStatus === 'passed' ? '✓' : '✗';
        console.log(`  ${statusIcon} ${test.title}`);
        console.log(`    File: ${test.file}`);
        console.log(`    Attempts: ${test.attempts}, Final: ${test.finalStatus}`);
        console.log('');
      }

      console.log('=========================\n');
    }
  }
}

export default FlakyTracker;

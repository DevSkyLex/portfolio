import '@angular/localize/init';
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed({ zoneless: true });

// jsdom has no IntersectionObserver (@defer "on viewport" blocks): nothing triggers in tests.
globalThis.IntersectionObserver ??= class {
  public observe(): void {
    // Nothing to observe in tests.
  }
  public unobserve(): void {
    // Same.
  }
  public disconnect(): void {
    // Same.
  }
  public takeRecords(): [] {
    return [];
  }
} as unknown as typeof IntersectionObserver;

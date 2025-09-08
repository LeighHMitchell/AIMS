import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export interface TestResult {
  field_key: string;
  ui_saved_initial: boolean;
  db_saved_initial: boolean;
  ui_saved_after_nav_back: boolean;
  db_saved_after_nav_back: boolean;
  ui_saved_after_refresh: boolean;
  db_saved_after_refresh: boolean;
  spinner_seen: boolean;
  spinner_timestamp?: number;
  tick_seen: boolean;
  tick_timestamp?: number;
  tick_while_empty: boolean;
  rapid_edit_success: boolean;
  notes: string;
  screencap_path?: string;
  video_path?: string;
  error_details?: string;
}

export class ReportGenerator {
  private results: TestResult[] = [];
  private testRunId: string;
  private artifactsDir: string;

  constructor() {
    this.testRunId = new Date().toISOString().replace(/[:.]/g, '-');
    this.artifactsDir = path.join(process.cwd(), 'test-artifacts', this.testRunId);
    this.ensureArtifactsDirectory();
  }

  private ensureArtifactsDirectory(): void {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  addResult(result: TestResult): void {
    this.results.push(result);
  }

  async generateCSVReport(): Promise<string> {
    const csvPath = path.join(this.artifactsDir, 'activity_editor_save_diagnostics.csv');
    
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'field_key', title: 'Field Key' },
        { id: 'ui_saved_initial', title: 'UI Saved Initial' },
        { id: 'db_saved_initial', title: 'DB Saved Initial' },
        { id: 'ui_saved_after_nav_back', title: 'UI Saved After Nav Back' },
        { id: 'db_saved_after_nav_back', title: 'DB Saved After Nav Back' },
        { id: 'ui_saved_after_refresh', title: 'UI Saved After Refresh' },
        { id: 'db_saved_after_refresh', title: 'DB Saved After Refresh' },
        { id: 'spinner_seen', title: 'Spinner Seen' },
        { id: 'spinner_timestamp', title: 'Spinner Timestamp' },
        { id: 'tick_seen', title: 'Tick Seen' },
        { id: 'tick_timestamp', title: 'Tick Timestamp' },
        { id: 'tick_while_empty', title: 'Tick While Empty' },
        { id: 'rapid_edit_success', title: 'Rapid Edit Success' },
        { id: 'notes', title: 'Notes' },
        { id: 'screencap_path', title: 'Screenshot Path' },
        { id: 'video_path', title: 'Video Path' },
        { id: 'error_details', title: 'Error Details' }
      ]
    });

    await csvWriter.writeRecords(this.results);
    return csvPath;
  }

  async generateJSONReport(): Promise<string> {
    const jsonPath = path.join(this.artifactsDir, 'activity_editor_save_diagnostics.json');
    
    const report = {
      testRunId: this.testRunId,
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      results: this.results
    };

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    return jsonPath;
  }

  private generateSummary(): any {
    const total = this.results.length;
    const passed = this.results.filter(r => this.isFieldPassing(r)).length;
    const failed = total - passed;

    const failureTypes = {
      ui_save_failed: this.results.filter(r => !r.ui_saved_initial).map(r => r.field_key),
      db_save_failed: this.results.filter(r => !r.db_saved_initial).map(r => r.field_key),
      nav_persistence_failed: this.results.filter(r => !r.ui_saved_after_nav_back || !r.db_saved_after_nav_back).map(r => r.field_key),
      refresh_persistence_failed: this.results.filter(r => !r.ui_saved_after_refresh || !r.db_saved_after_refresh).map(r => r.field_key),
      spinner_not_seen: this.results.filter(r => !r.spinner_seen).map(r => r.field_key),
      tick_not_seen: this.results.filter(r => !r.tick_seen).map(r => r.field_key),
      tick_while_empty_issue: this.results.filter(r => r.tick_while_empty).map(r => r.field_key),
      rapid_edit_failed: this.results.filter(r => !r.rapid_edit_success).map(r => r.field_key)
    };

    return {
      total,
      passed,
      failed,
      passRate: `${((passed / total) * 100).toFixed(2)}%`,
      failureTypes
    };
  }

  private isFieldPassing(result: TestResult): boolean {
    return result.ui_saved_initial &&
           result.db_saved_initial &&
           result.ui_saved_after_nav_back &&
           result.db_saved_after_nav_back &&
           result.ui_saved_after_refresh &&
           result.db_saved_after_refresh &&
           result.spinner_seen &&
           result.tick_seen &&
           !result.tick_while_empty &&
           result.rapid_edit_success;
  }

  generateHumanReadableSummary(): string {
    const summary = this.generateSummary();
    let output = '\n' + '='.repeat(80) + '\n';
    output += '                    ACTIVITY EDITOR SAVE DIAGNOSTICS SUMMARY\n';
    output += '='.repeat(80) + '\n\n';

    output += `Test Run ID: ${this.testRunId}\n`;
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    output += '📊 OVERALL RESULTS\n';
    output += '-'.repeat(40) + '\n';
    output += `Total Fields Tested: ${summary.total}\n`;
    output += `✅ Passed: ${summary.passed}\n`;
    output += `❌ Failed: ${summary.failed}\n`;
    output += `Pass Rate: ${summary.passRate}\n\n`;

    output += '✅ FIELDS PASSING ALL CHECKS\n';
    output += '-'.repeat(40) + '\n';
    const passingFields = this.results.filter(r => this.isFieldPassing(r));
    if (passingFields.length > 0) {
      passingFields.forEach(field => {
        output += `  ✓ ${field.field_key}\n`;
      });
    } else {
      output += '  None\n';
    }
    output += '\n';

    output += '❌ FAILURES BY TYPE\n';
    output += '-'.repeat(40) + '\n';

    const failureCategories = [
      { title: '🔴 Initial Save Failures (UI)', fields: summary.failureTypes.ui_save_failed },
      { title: '🔴 Initial Save Failures (DB)', fields: summary.failureTypes.db_save_failed },
      { title: '🔄 Navigation Persistence Failures', fields: summary.failureTypes.nav_persistence_failed },
      { title: '🔄 Refresh Persistence Failures', fields: summary.failureTypes.refresh_persistence_failed },
      { title: '⏳ Saving Spinner Not Shown', fields: summary.failureTypes.spinner_not_seen },
      { title: '✓ Success Tick Not Shown', fields: summary.failureTypes.tick_not_seen },
      { title: '⚠️ Tick Shown While Empty', fields: summary.failureTypes.tick_while_empty_issue },
      { title: '⚡ Rapid Edit Race Condition', fields: summary.failureTypes.rapid_edit_failed }
    ];

    failureCategories.forEach(category => {
      if (category.fields.length > 0) {
        output += `\n${category.title}:\n`;
        category.fields.forEach(field => {
          const result = this.results.find(r => r.field_key === field);
          output += `  • ${field}`;
          if (result?.screencap_path) {
            output += ` [Screenshot: ${result.screencap_path}]`;
          }
          if (result?.video_path) {
            output += ` [Video: ${result.video_path}]`;
          }
          output += '\n';
          if (result?.notes) {
            output += `    Note: ${result.notes}\n`;
          }
        });
      }
    });

    output += '\n' + '='.repeat(80) + '\n';
    output += `Full reports available at:\n`;
    output += `  CSV: ${path.join(this.artifactsDir, 'activity_editor_save_diagnostics.csv')}\n`;
    output += `  JSON: ${path.join(this.artifactsDir, 'activity_editor_save_diagnostics.json')}\n`;
    output += '='.repeat(80) + '\n';

    return output;
  }

  saveScreenshot(fieldKey: string, screenshotBuffer: Buffer): string {
    const screenshotPath = path.join(this.artifactsDir, `${fieldKey}_failure.png`);
    fs.writeFileSync(screenshotPath, screenshotBuffer);
    return screenshotPath;
  }

  getArtifactsDirectory(): string {
    return this.artifactsDir;
  }

  getTestRunId(): string {
    return this.testRunId;
  }
}

export default ReportGenerator;
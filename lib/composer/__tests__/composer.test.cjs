/**
 * Composer Module Tests
 *
 * Tests for template loading, composition, and validation.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const composer = require('../index.cjs');

describe('Template Loading', () => {
  test('listTemplates returns array of template names', () => {
    const templates = composer.listTemplates();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
  });

  test('listTemplates includes phase templates', () => {
    const templates = composer.listTemplates();
    expect(templates).toContain('phase-2');
    expect(templates).toContain('phase-3');
    expect(templates).toContain('phase-4');
    expect(templates).toContain('phase-5');
  });

  test('loadTemplate returns template content', () => {
    const content = composer.loadTemplate('phase-2');
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });

  test('loadTemplate throws for non-existent template', () => {
    expect(() => composer.loadTemplate('nonexistent')).toThrow('Template not found');
  });

  test('getTemplateInfo returns template metadata', () => {
    const info = composer.getTemplateInfo();
    expect(Array.isArray(info)).toBe(true);

    const phase2Info = info.find(t => t.name === 'phase-2');
    expect(phase2Info).toBeDefined();
    expect(phase2Info.isPhase).toBe(true);
    expect(phase2Info.size).toBeGreaterThan(0);
    expect(phase2Info.lines).toBeGreaterThan(0);
  });
});

describe('Context Injection', () => {
  test('injectContext replaces placeholders', () => {
    const template = 'Hello {{name}}, welcome to {{project}}!';
    const result = composer.injectContext(template, {
      name: 'World',
      project: 'Pipeline'
    });
    expect(result).toBe('Hello World, welcome to Pipeline!');
  });

  test('injectContext keeps unreplaced placeholders', () => {
    const template = 'Hello {{name}}, you have {{count}} messages';
    const result = composer.injectContext(template, { name: 'User' });
    expect(result).toBe('Hello User, you have {{count}} messages');
  });

  test('findUnreplacedPlaceholders finds missing placeholders', () => {
    const content = 'Hello {{name}}, welcome to {{project}} at {{time}}';
    const unreplaced = composer.findUnreplacedPlaceholders(content);
    expect(unreplaced).toContain('name');
    expect(unreplaced).toContain('project');
    expect(unreplaced).toContain('time');
  });

  test('findUnreplacedPlaceholders returns empty for complete content', () => {
    const content = 'Hello World, welcome to Pipeline';
    const unreplaced = composer.findUnreplacedPlaceholders(content);
    expect(unreplaced).toHaveLength(0);
  });
});

describe('Template Composition', () => {
  test('compose returns content for phase 2', () => {
    const content = composer.compose('2', { projectName: 'test' });
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });

  test('compose returns content for phase 3', () => {
    const content = composer.compose('3', { projectName: 'test' });
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });

  test('compose returns content for phase 4', () => {
    const content = composer.compose('4', { projectName: 'test' });
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });

  test('compose returns content for phase 5', () => {
    const content = composer.compose('5', { projectName: 'test' });
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });

  test('compose includes project context', () => {
    const content = composer.compose('2', {
      projectName: 'MyTestProject'
    });
    // If template uses {{projectName}} it should be replaced
    expect(content).not.toContain('{{projectName}}');
  });

  test('composeSupervisor returns supervisor content', () => {
    const content = composer.composeSupervisor({ projectName: 'test' });
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
    expect(content.toLowerCase()).toContain('review');
  });
});

describe('Validation', () => {
  test('validate accepts valid content', () => {
    const content = `# Phase 2 Worker Instructions

## Rules

Follow these rules carefully.

## Phase Details

Phase-specific instructions here.
`;
    const result = composer.validate(content, '2');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validate rejects empty content', () => {
    const result = composer.validate('');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('empty'))).toBe(true);
  });

  test('validate detects unreplaced placeholders', () => {
    const content = '# Test with {{unreplaced}} placeholder';
    const result = composer.validate(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('placeholder'))).toBe(true);
  });

  test('validate warns about short content', () => {
    const content = '# Short\n\nToo short.';
    const result = composer.validate(content);
    expect(result.warnings.some(w => w.includes('short'))).toBe(true);
  });

  test('validateMarkdownStructure checks headings', () => {
    const noHeading = 'Just some content without headings';
    const result = composer.validateMarkdownStructure(noHeading);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('heading'))).toBe(true);
  });

  test('validateMarkdownStructure checks code blocks', () => {
    const unclosed = '# Test\n\n```javascript\nconst x = 1;\n// no closing';
    const result = composer.validateMarkdownStructure(unclosed);
    expect(result.errors.some(e => e.includes('code block'))).toBe(true);
  });

  test('validateComposed combines validations', () => {
    const content = composer.compose('2', { projectName: 'test' });
    const result = composer.validateComposed(content, { phase: '2' });
    expect(result.valid).toBe(true);
  });
});

describe('Project Operations', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'composer-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('getOutputPath returns correct path', () => {
    const outputPath = composer.getOutputPath(tempDir);
    expect(outputPath).toContain('.claude');
    expect(outputPath).toContain('CLAUDE.md');
  });

  test('ensureOutputDir creates .claude directory', () => {
    composer.ensureOutputDir(tempDir);
    const claudeDir = path.join(tempDir, '.claude');
    expect(fs.existsSync(claudeDir)).toBe(true);
  });

  test('writeToProject writes content', () => {
    const content = `# Test

## Rules

Test content here.

## Phase

More content.
`;
    composer.writeToProject(tempDir, content, { validate: false });

    const outputPath = composer.getOutputPath(tempDir);
    expect(fs.existsSync(outputPath)).toBe(true);

    const written = fs.readFileSync(outputPath, 'utf8');
    expect(written).toBe(content);
  });

  test('writeToProject creates backup', () => {
    const content1 = '# First\n\n## Rules\n\n## Phase\n\nContent';
    const content2 = '# Second\n\n## Rules\n\n## Phase\n\nContent';

    composer.writeToProject(tempDir, content1, { validate: false });
    composer.writeToProject(tempDir, content2, { validate: false });

    const backupPath = composer.getOutputPath(tempDir) + '.backup';
    expect(fs.existsSync(backupPath)).toBe(true);

    const backup = fs.readFileSync(backupPath, 'utf8');
    expect(backup).toBe(content1);
  });

  test('readFromProject reads content', () => {
    const content = '# Test Content\n\n## Rules\n\n## Phase';
    composer.writeToProject(tempDir, content, { validate: false });

    const read = composer.readFromProject(tempDir);
    expect(read).toBe(content);
  });

  test('readFromProject returns null for missing file', () => {
    const read = composer.readFromProject(tempDir);
    expect(read).toBeNull();
  });

  test('composeAndWrite creates file', () => {
    const content = composer.composeAndWrite(tempDir, '2', {});
    expect(typeof content).toBe('string');

    const outputPath = composer.getOutputPath(tempDir);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});

describe('Module Exports', () => {
  test('exports template functions', () => {
    expect(typeof composer.loadTemplate).toBe('function');
    expect(typeof composer.listTemplates).toBe('function');
    expect(typeof composer.getTemplateInfo).toBe('function');
  });

  test('exports composition functions', () => {
    expect(typeof composer.compose).toBe('function');
    expect(typeof composer.composeSupervisor).toBe('function');
    expect(typeof composer.composeOrchestrator).toBe('function');
    expect(typeof composer.injectContext).toBe('function');
    expect(typeof composer.findUnreplacedPlaceholders).toBe('function');
  });

  test('exports validation functions', () => {
    expect(typeof composer.validate).toBe('function');
    expect(typeof composer.validateMarkdownStructure).toBe('function');
    expect(typeof composer.validateSupervisor).toBe('function');
    expect(typeof composer.validateComposed).toBe('function');
  });

  test('exports project functions', () => {
    expect(typeof composer.getOutputPath).toBe('function');
    expect(typeof composer.ensureOutputDir).toBe('function');
    expect(typeof composer.writeToProject).toBe('function');
    expect(typeof composer.readFromProject).toBe('function');
    expect(typeof composer.composeAndWrite).toBe('function');
  });

  test('exports constants', () => {
    expect(composer.TEMPLATES_DIR).toBeDefined();
    expect(composer.OUTPUT_DIR).toBe('.claude');
    expect(composer.PLACEHOLDER_PATTERN).toBeInstanceOf(RegExp);
  });
});

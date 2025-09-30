import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface WorkflowConfig {
  name: string;
  on: {
    push: {
      tags: string[];
    };
  };
  jobs: {
    publish: {
      steps: Array<{
        name: string;
        env?: Record<string, string>;
        id?: string;
        run?: string;
      }>;
    };
  };
}

describe('GitHub Actions Workflows', () => {
  const workflowsDir = path.join(__dirname, '../../.github/workflows');

  describe('npm-publish.yml', () => {
    const workflowPath = path.join(workflowsDir, 'npm-publish.yml');

    it('should exist', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    it('should have valid YAML syntax', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(() => yaml.load(content)).not.toThrow();
    });

    it('should trigger on version tags', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const workflow = yaml.load(content) as WorkflowConfig;

      expect(workflow.on.push.tags).toEqual(['v*']);
    });

    it('should include quality checks before publishing', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const workflow = yaml.load(content) as WorkflowConfig;

      const steps = workflow.jobs.publish.steps;
      const stepNames = steps.map((step) => step.name);

      expect(stepNames).toContain('Run all quality checks');
      expect(stepNames).toContain('Run tests');
      expect(stepNames).toContain('Build project');
      expect(stepNames).toContain('Publish to NPM with provenance');
    });

    it('should use NPM_TOKEN for authentication', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const workflow = yaml.load(content) as WorkflowConfig;

      const publishStep = workflow.jobs.publish.steps.find(
        (step) => step.name === 'Publish to NPM with provenance'
      );

      expect(publishStep?.env?.NODE_AUTH_TOKEN).toBe(
        '${{ secrets.NPM_TOKEN }}'
      );
    });

    it('should handle version extraction from tags', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const workflow = yaml.load(content) as WorkflowConfig;

      const extractStep = workflow.jobs.publish.steps.find(
        (step) => step.name === 'Extract version from tag'
      );

      expect(extractStep?.id).toBe('extract_version');
      expect(extractStep?.run).toContain('VERSION=${GITHUB_REF#refs/tags/v}');
    });
  });

  describe('existing workflows', () => {
    it('should have CI workflow', () => {
      expect(fs.existsSync(path.join(workflowsDir, 'ci.yml'))).toBe(true);
    });

    it('should have code quality workflow', () => {
      expect(fs.existsSync(path.join(workflowsDir, 'code-quality.yml'))).toBe(
        true
      );
    });

    it('should have PR checks workflow', () => {
      expect(fs.existsSync(path.join(workflowsDir, 'pr-checks.yml'))).toBe(
        true
      );
    });
  });
});

import * as fs from 'fs';
import * as path from 'path';

export type PackageStatus = 'ok' | 'legacy' | 'deprecated' | 'replaced' | 'incompatible';

export type MigrationComplexity = 'low' | 'medium' | 'high';

export type PackageCategory = 
  | 'authentication'
  | 'validation'
  | 'database'
  | 'routing'
  | 'ui'
  | 'performance'
  | 'publication'
  | 'forms'
  | 'files'
  | 'reactivity'
  | 'testing'
  | 'deployment'
  | 'other';

export interface CommunityNote {
  author?: string;
  note: string;
  date?: string;
}

export interface PackageMigrationInfo {
  status: PackageStatus;
  suggest: string[];
  notes: string;
  migrationComplexity: MigrationComplexity;
  automaticMigration: boolean;
  category: PackageCategory;
  lastUpdated?: string;
  meteor3Tested?: boolean;
  communityNotes?: CommunityNote[];
}

export interface PackageMapping {
  $schema?: string;
  version: string;
  description?: string;
  packages: Record<string, PackageMigrationInfo>;
}

export class PackageMappingService {
  private mapping: PackageMapping | null = null;
  private mappingPath: string;

  constructor(projectRoot?: string) {
    this.mappingPath = path.join(projectRoot || process.cwd(), 'package-mapping.json');
  }

  /**
   * Load the package mapping from the JSON file
   */
  async loadMapping(): Promise<PackageMapping | null> {
    try {
      if (!fs.existsSync(this.mappingPath)) {
        return null;
      }

      const content = await fs.promises.readFile(this.mappingPath, 'utf8');
      this.mapping = JSON.parse(content) as PackageMapping;
      return this.mapping;
    } catch (error) {
      console.warn(`Failed to load package mapping from ${this.mappingPath}:`, error);
      return null;
    }
  }

  /**
   * Get migration info for a specific package
   */
  getPackageInfo(packageName: string): PackageMigrationInfo | null {
    if (!this.mapping) {
      return null;
    }
    return this.mapping.packages[packageName] || null;
  }

  /**
   * Get all packages with a specific status
   */
  getPackagesByStatus(status: PackageStatus): Array<{ name: string; info: PackageMigrationInfo }> {
    if (!this.mapping) {
      return [];
    }

    return Object.entries(this.mapping.packages)
      .filter(([, info]) => info.status === status)
      .map(([name, info]) => ({ name, info }));
  }

  /**
   * Get all packages in a specific category
   */
  getPackagesByCategory(category: PackageCategory): Array<{ name: string; info: PackageMigrationInfo }> {
    if (!this.mapping) {
      return [];
    }

    return Object.entries(this.mapping.packages)
      .filter(([, info]) => info.category === category)
      .map(([name, info]) => ({ name, info }));
  }

  /**
   * Get packages that have automatic migration available
   */
  getAutomaticallyMigratablePackages(): Array<{ name: string; info: PackageMigrationInfo }> {
    if (!this.mapping) {
      return [];
    }

    return Object.entries(this.mapping.packages)
      .filter(([, info]) => info.automaticMigration)
      .map(([name, info]) => ({ name, info }));
  }

  /**
   * Get migration suggestions for a package
   */
  getMigrationSuggestions(packageName: string): string[] {
    const info = this.getPackageInfo(packageName);
    return info?.suggest || [];
  }

  /**
   * Check if mapping is loaded
   */
  isLoaded(): boolean {
    return this.mapping !== null;
  }

  /**
   * Get all package names in the mapping
   */
  getAllPackageNames(): string[] {
    if (!this.mapping) {
      return [];
    }
    return Object.keys(this.mapping.packages);
  }

  /**
   * Generate a migration report for packages found in the project
   */
  generateMigrationReport(detectedPackages: string[]): MigrationReport {
    const packageIssues: PackageIssue[] = [];
    const suggestions: PackageSuggestion[] = [];

    for (const packageName of detectedPackages) {
      const info = this.getPackageInfo(packageName);
      if (!info) {
        continue;
      }

      if (info.status !== 'ok') {
        packageIssues.push({
          packageName,
          status: info.status,
          complexity: info.migrationComplexity,
          automaticMigration: info.automaticMigration,
          notes: info.notes
        });
      }

      if (info.suggest.length > 0) {
        suggestions.push({
          packageName,
          alternatives: info.suggest,
          notes: info.notes
        });
      }
    }

    return {
      packageIssues,
      suggestions,
      totalPackages: detectedPackages.length,
      problemPackages: packageIssues.length
    };
  }
}

export interface PackageIssue {
  packageName: string;
  status: PackageStatus;
  complexity: MigrationComplexity;
  automaticMigration: boolean;
  notes: string;
}

export interface PackageSuggestion {
  packageName: string;
  alternatives: string[];
  notes: string;
}

export interface MigrationReport {
  packageIssues: PackageIssue[];
  suggestions: PackageSuggestion[];
  totalPackages: number;
  problemPackages: number;
}

// Default instance for global use
export const packageMappingService = new PackageMappingService();
import { Transform } from 'jscodeshift';

export interface TransformResult {
  path: string;
  source: string;
  hasChanges: boolean;
  changes: Change[];
}

export interface Change {
  type: 'add' | 'modify' | 'remove';
  description: string;
  line?: number;
  column?: number;
  oldCode?: string;
  newCode?: string;
}

export interface Plugin {
  name: string;
  description: string;
  transform: Transform;
  options?: Record<string, any>;
}

export abstract class BasePlugin implements Plugin {
  abstract name: string;
  abstract description: string;
  abstract transform: Transform;
  
  options?: Record<string, any>;
  
  constructor(options?: Record<string, any>) {
    this.options = options;
  }
}

export interface PluginRegistry {
  register(plugin: Plugin): void;
  get(name: string): Plugin | undefined;
  getAll(): Plugin[];
  run(pluginName: string, source: string, path: string): TransformResult;
}
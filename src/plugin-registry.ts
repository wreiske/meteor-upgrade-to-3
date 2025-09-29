import jscodeshift, { Transform } from 'jscodeshift';
import { Plugin, PluginRegistry, TransformResult } from './types';

export class DefaultPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, Plugin>();
  
  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
  
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  run(pluginName: string, source: string, path: string): TransformResult {
    const plugin = this.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    
    try {
      const result = plugin.transform(
        { source, path },
        { 
          jscodeshift, 
          j: jscodeshift,
          stats: () => {},
          report: () => {}
        },
        plugin.options || {}
      );
      
      const transformedSource = (typeof result === 'string' ? result : source);
      
      return {
        path,
        source: transformedSource,
        hasChanges: transformedSource !== source,
        changes: [], // TODO: Extract changes from AST diff
      };
    } catch (error) {
      throw new Error(`Plugin ${pluginName} failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}

// Export a default registry instance
export const pluginRegistry = new DefaultPluginRegistry();
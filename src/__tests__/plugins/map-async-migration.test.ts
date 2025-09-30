import { CursorAsyncPlugin } from '../../plugins/cursor-async';
import { AsyncApiPlugin } from '../../plugins/async-api';
import jscodeshift from 'jscodeshift';

/**
 * Integration test for the specific migration pattern described in the issue:
 * Support migration from .map to .mapAsync with async .findOneAsync pattern
 */
describe('Map to MapAsync Migration Integration', () => {
  let cursorPlugin: CursorAsyncPlugin;
  let asyncPlugin: AsyncApiPlugin;

  beforeEach(() => {
    cursorPlugin = new CursorAsyncPlugin();
    asyncPlugin = new AsyncApiPlugin();
  });

  const runAsyncApiTransform = (source: string) => {
    return asyncPlugin.transform(
      { source, path: 'test.js' },
      { jscodeshift, j: jscodeshift, stats: () => {}, report: () => {} },
      {}
    ) as string | undefined;
  };

  const runCursorAsyncTransform = (source: string) => {
    return cursorPlugin.transform(
      { source, path: 'test.js' },
      { jscodeshift, j: jscodeshift, stats: () => {}, report: () => {} },
      {}
    ) as string | undefined;
  };

  const applyBothPlugins = (source: string) => {
    // Apply async-api plugin first to transform findOne -> findOneAsync
    const firstResult = runAsyncApiTransform(source);
    
    // Apply cursor-async plugin second to transform map -> mapAsync
    const secondResult = runCursorAsyncTransform(firstResult || source);

    return secondResult || firstResult;
  };

  describe('Issue migration pattern', () => {
    it('should support the exact "Before" -> "After" pattern from the issue', () => {
      const beforeCode = `const workspaceMcpLinks = WorkspaceMCPServerLinks.find({
      workspaceId: workspace ? workspace._id : null,
    });
mcpTools = workspaceMcpLinks.map(function (serverLink) {
  const mcpServer = MCPServers.findOne({
    _id: serverLink.serverId,
  });
  return getOpenAiMcpToolDefinition({ label: serverLink.name, url: mcpServer.url, requireApproval: serverLink.openAi.require_approval, authToken: serverLink.authToken });
});`;

      const result = applyBothPlugins(beforeCode);

      // Verify all transformations occurred
      expect(result).toContain('await workspaceMcpLinks.mapAsync');
      expect(result).toContain('async function(serverLink)'); // Note: no space before parenthesis
      expect(result).toContain('await MCPServers.findOneAsync');
      
      // The result should match the expected "After" pattern from the issue
      expect(result).toContain('mcpTools = await workspaceMcpLinks.mapAsync(async function(serverLink)');
    });

    it('should handle error scenarios gracefully', () => {
      const codeWithError = `const workspaceMcpLinks = WorkspaceMCPServerLinks.find({});
mcpTools = workspaceMcpLinks.map(function (serverLink) {
  const mcpServer = MCPServers.findOne({ _id: serverLink.serverId });
  if (!mcpServer) {
    throw new Error('Server not found');
  }
  return getOpenAiMcpToolDefinition({ url: mcpServer.url });
});`;

      const result = applyBothPlugins(codeWithError);
      
      expect(result).toContain('await workspaceMcpLinks.mapAsync');
      expect(result).toContain('await MCPServers.findOneAsync');
      expect(result).toContain('throw new Error'); // Error handling preserved
    });

    it('should work with arrow functions in callbacks', () => {
      const arrowFunctionCode = `const links = ServerLinks.find({});
const tools = links.map(link => {
  const server = Servers.findOne({ _id: link.serverId });
  return createTool(server);
});`;

      const result = applyBothPlugins(arrowFunctionCode);
      
      expect(result).toContain('await links.mapAsync');
      expect(result).toContain('await Servers.findOneAsync');
      expect(result).toContain('async link =>'); // Arrow function made async
    });

    it('should handle nested async operations', () => {
      const nestedCode = `const workspaces = Workspaces.find({});
const data = workspaces.map(function(workspace) {
  const links = Links.findOne({ workspaceId: workspace._id });
  const server = Servers.findOne({ _id: links.serverId });
  return { workspace, links, server };
});`;

      const result = applyBothPlugins(nestedCode);
      
      expect(result).toContain('await workspaces.mapAsync');
      expect(result).toContain('async function(workspace)');
      expect(result).toContain('await Links.findOneAsync');
      expect(result).toContain('await Servers.findOneAsync');
    });

    it('should preserve non-async callbacks when no async operations present', () => {
      const syncCode = `const users = Users.find({});
const names = users.map(user => user.name);`;

      const result = applyBothPlugins(syncCode);
      
      expect(result).toContain('await users.mapAsync');
      // Callback should remain non-async since no async operations
      expect(result).not.toContain('async user =>');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty cursor results', () => {
      const emptyCode = `const empty = EmptyCollection.find({});
const results = empty.map(() => null);`;

      const result = applyBothPlugins(emptyCode);
      
      expect(result).toContain('await empty.mapAsync');
    });

    it('should not transform non-cursor map calls', () => {
      const nonCursorCode = `const array = [1, 2, 3];
const doubled = array.map(x => x * 2);`;

      const result = applyBothPlugins(nonCursorCode);
      
      // Should not transform regular array map
      if (result) {
        expect(result).not.toContain('mapAsync');
      } else {
        expect(result).toBeUndefined();
      }
    });

    it('should handle complex cursor variable assignments', () => {
      const complexCode = `function getWorkspaceData() {
  const workspaceLinks = WorkspaceLinks.find({ active: true });
  return workspaceLinks.map(function(link) {
    const server = Servers.findOne({ _id: link.serverId });
    return server ? server.url : null;
  });
}`;

      const result = applyBothPlugins(complexCode);
      
      expect(result).toContain('async function getWorkspaceData');
      expect(result).toContain('await workspaceLinks.mapAsync');
      expect(result).toContain('await Servers.findOneAsync');
    });
  });
});
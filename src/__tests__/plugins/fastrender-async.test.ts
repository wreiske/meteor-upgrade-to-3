import { FastRenderAsyncPlugin } from '../../plugins/fastrender-async';
import jscodeshift from 'jscodeshift';

describe('FastRenderAsyncPlugin', () => {
  let plugin: FastRenderAsyncPlugin;

  beforeEach(() => {
    plugin = new FastRenderAsyncPlugin();
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(plugin.name).toBe('fastrender-async');
      expect(plugin.description).toContain('FastRender');
      expect(plugin.description).toContain('async');
    });
  });

  describe('transform', () => {
    const runTransform = (source: string) => {
      return plugin.transform(
        { source, path: 'test.js' },
        { jscodeshift, j: jscodeshift, stats: () => {}, report: () => {} },
        {}
      );
    };

    describe('FastRender.onAllRoutes transformation', () => {
      it('should transform basic onAllRoutes function to async', () => {
        const input = `
FastRender.onAllRoutes(function () {
    this.subscribe('AmiStatus');
    this.subscribe('userInfo');
    this.subscribe('UserCount');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function');
        expect(result).toContain('await this.subscribe(\'AmiStatus\')');
        expect(result).toContain('await this.subscribe(\'userInfo\')');
        expect(result).toContain('await this.subscribe(\'UserCount\')');
      });

      it('should transform arrow function onAllRoutes to async', () => {
        const input = `
FastRender.onAllRoutes(() => {
    this.subscribe('AmiStatus');
    this.subscribe('userInfo');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async ()');
        expect(result).toContain('await this.subscribe(\'AmiStatus\')');
        expect(result).toContain('await this.subscribe(\'userInfo\')');
      });

      it('should handle onAllRoutes with parameters', () => {
        const input = `
FastRender.onAllRoutes(function (params) {
    this.subscribe('UserData', params.userId);
    this.subscribe('Posts');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function(params)');
        expect(result).toContain('await this.subscribe(\'UserData\', params.userId)');
        expect(result).toContain('await this.subscribe(\'Posts\')');
      });

      it('should not modify already async functions', () => {
        const input = `
FastRender.onAllRoutes(async function () {
    await this.subscribe('AmiStatus');
    await this.subscribe('userInfo');
});`;
        const result = runTransform(input);
        
        // Should still add await to any non-awaited subscriptions
        expect(result).toContain('async function');
        expect(result).toContain('await this.subscribe(\'AmiStatus\')');
        expect(result).toContain('await this.subscribe(\'userInfo\')');
      });

      it('should handle mixed awaited and non-awaited subscriptions', () => {
        const input = `
FastRender.onAllRoutes(async function () {
    await this.subscribe('AlreadyAwaited');
    this.subscribe('NeedsAwait');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function');
        expect(result).toContain('await this.subscribe(\'AlreadyAwaited\')');
        expect(result).toContain('await this.subscribe(\'NeedsAwait\')');
      });
    });

    describe('individual route handlers', () => {
      it('should handle FastRender.route with subscribe calls', () => {
        const input = `
FastRender.route('/posts/:_id', function(params) {
    this.subscribe('singlePost', params._id);
    this.subscribe('comments', params._id);
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function(params)');
        expect(result).toContain('await this.subscribe(\'singlePost\', params._id)');
        expect(result).toContain('await this.subscribe(\'comments\', params._id)');
      });

      it('should handle other FastRender methods', () => {
        const input = `
FastRender.onBeforeAction(function() {
    this.subscribe('globalData');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function()');
        expect(result).toContain('await this.subscribe(\'globalData\')');
      });
    });

    describe('complex scenarios', () => {
      it('should handle conditional subscriptions', () => {
        const input = `
FastRender.onAllRoutes(function () {
    if (this.userId) {
        this.subscribe('userPrivateData');
    }
    this.subscribe('publicData');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function');
        expect(result).toContain('await this.subscribe(\'userPrivateData\')');
        expect(result).toContain('await this.subscribe(\'publicData\')');
      });

      it('should handle subscriptions in try-catch blocks', () => {
        const input = `
FastRender.onAllRoutes(function () {
    try {
        this.subscribe('riskySubscription');
    } catch (error) {
        console.log('Subscription failed');
    }
    this.subscribe('safeSubscription');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function');
        expect(result).toContain('await this.subscribe(\'riskySubscription\')');
        expect(result).toContain('await this.subscribe(\'safeSubscription\')');
      });

      it('should handle multiple onAllRoutes calls', () => {
        const input = `
FastRender.onAllRoutes(function () {
    this.subscribe('global1');
});

FastRender.onAllRoutes(function () {
    this.subscribe('global2');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function');
        expect(result).toContain('await this.subscribe(\'global1\')');
        expect(result).toContain('await this.subscribe(\'global2\')');
      });

      it('should handle nested function calls with subscriptions', () => {
        const input = `
FastRender.onAllRoutes(function () {
    const helper = function() {
        // This should not be transformed as it's not a direct this.subscribe
        return 'helper';
    };
    this.subscribe('mainSubscription');
    helper();
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function()');
        expect(result).toContain('await this.subscribe(\'mainSubscription\')');
        expect(result).toContain('const helper = function() {');
      });
    });

    describe('no changes scenarios', () => {
      it('should return undefined when no FastRender calls found', () => {
        const input = `
function regularFunction() {
    console.log('No FastRender here');
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should return undefined when no subscribe calls in FastRender', () => {
        const input = `
FastRender.onAllRoutes(function () {
    console.log('No subscriptions here');
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function');
      });

      it('should not modify unrelated this.subscribe calls', () => {
        const input = `
const myObject = {
    subscribe: function(name) {
        console.log('Not FastRender subscribe');
    },
    
    method: function() {
        this.subscribe('test');
    }
};`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify subscribe calls on other objects', () => {
        const input = `
function test() {
    someObject.subscribe('test');
    Meteor.subscribe('test');
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle empty onAllRoutes function', () => {
        const input = `
FastRender.onAllRoutes(function () {
    // Empty function
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function');
      });

      it('should handle onAllRoutes with complex parameters', () => {
        const input = `
FastRender.onAllRoutes(function (params, query, { isBot }) {
    if (!isBot) {
        this.subscribe('userSpecific', params.id, query.filter);
    }
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function(params, query, { isBot })');
        expect(result).toContain('await this.subscribe(\'userSpecific\', params.id, query.filter)');
      });

      it('should handle subscription calls with multiple parameters', () => {
        const input = `
FastRender.onAllRoutes(function () {
    this.subscribe('complexSub', param1, param2, { option: true });
});`;
        const result = runTransform(input);
        
        expect(result).toContain('async function');
        expect(result).toContain('await this.subscribe(\'complexSub\', param1, param2, { option: true })');
      });
    });
  });
});
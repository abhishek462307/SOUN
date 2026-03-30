import { ExecutionEngine } from '../core/execution-engine';
import { Registry } from '../core/registry';

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
    engine = new ExecutionEngine(registry);
  });

  test('should execute internal action handler', async () => {
    const handler = jest.fn().mockResolvedValue({ success: true });
    const action = await registry.register({
      name: 'internal_test',
      provider: 'test',
      handler
    });

    const response = await engine.execute(action.action_id, { foo: 'bar' });
    
    expect(response.status).toBe('success');
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
    expect(response.data).toEqual({ success: true });
  });

  test('should handle missing action', async () => {
    const response = await engine.execute('non_existent', {});
    expect(response.status).toBe('failure');
    expect(response.message).toContain('Action not found');
  });

  test('should handle execution errors gracefully', async () => {
    const action = await registry.register({
      name: 'fail_test',
      provider: 'test',
      handler: async () => { throw new Error('Action failed'); }
    });

    const response = await engine.execute(action.action_id, {});
    expect(response.status).toBe('failure');
    expect(response.message).toBe('Action failed');
  });

  test('should retry on failure', async () => {
    let calls = 0;
    const action = await registry.register({
      name: 'retry_test',
      provider: 'test',
      handler: async () => {
        calls++;
        if (calls < 2) throw new Error('First fail');
        return { success: true };
      }
    });

    const response = await engine.execute(action.action_id, {}, undefined, { retries: 1, fallback: false });
    expect(response.status).toBe('success');
    expect(calls).toBe(2);
  });

  test('should fallback to alternative action on total failure', async () => {
    const failingAction = await registry.register({
      name: 'book_cab',
      provider: 'bad_provider',
      handler: async () => { throw new Error('Bad provider fail'); }
    });

    const workingAction = await registry.register({
      name: 'book_cab',
      provider: 'good_provider',
      handler: async () => { return { success: true, provider: 'good' }; }
    });

    // Execute the failing one, but expect it to fallback to the good one
    // We need to provide intentText for fallback to work
    const response = await engine.execute(failingAction.action_id, {}, 'book_cab', { retries: 0, fallback: true });
    
    expect(response.status).toBe('success');
    expect(response.data.provider).toBe('good');
  });

  test('should enforce JSON Schema validation', async () => {
    const action = await registry.register({
      name: 'schema_test',
      provider: 'test',
      parameters: {
        type: 'object',
        properties: {
          age: { type: 'number', minimum: 18 }
        },
        required: ['age']
      },
      handler: async () => ({ success: true })
    });

    // Invalid input: missing required field 'age'
    const res1 = await engine.execute(action.action_id, {});
    expect(res1.status).toBe('failure');
    expect(res1.message).toContain("must have required property 'age'");

    // Invalid input: age too low
    const res2 = await engine.execute(action.action_id, { age: 10 });
    expect(res2.status).toBe('failure');
    expect(res2.message).toContain('must be >= 18');

    // Valid input
    const res3 = await engine.execute(action.action_id, { age: 20 });
    expect(res3.status).toBe('success');
  });
});

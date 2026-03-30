import { Registry } from '../core/registry';
import { Intent } from '../models/intent';

describe('Registry', () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  test('should register a new action', async () => {
    const action = await registry.register({
      name: 'test_action',
      provider: 'test_provider',
      description: 'A test action'
    });

    expect(action.action_id).toBeDefined();
    expect(action.name).toBe('test_action');
    expect(registry.getAction(action.action_id)).toBe(action);
  });

  test('should search actions by intent', async () => {
    await registry.register({
      name: 'book_flight',
      provider: 'travel_service'
    });

    const results = await registry.search({ intent: 'book a flight' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('book_flight');
  });

  test('should normalize intents correctly', async () => {
    await registry.register({
      name: 'book_cab',
      provider: 'ride_service'
    });

    const results = await registry.search({ intent: 'get me a ride' });
    expect(results[0].name).toBe('book_cab');
  });

  test('should update trust score correctly', async () => {
    const action = await registry.register({
      name: 'trust_test',
      provider: 'test'
    });

    await registry.updateActionTrust(action.action_id, 1); // Success
    expect(registry.getAction(action.action_id)?.trust_score).toBe(1);

    await registry.updateActionTrust(action.action_id, -1); // Failure
    expect(registry.getAction(action.action_id)?.trust_score).toBe(0.5);
  });
});

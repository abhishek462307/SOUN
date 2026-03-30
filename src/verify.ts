import { registry } from './core/registry';
import { agentRegistry } from './core/agent-registry';
import { executionEngine } from './core/execution-engine';
import { loggingSystem } from './core/logging-system';
import { paymentSystem } from './core/payment-system';
import { blockchain } from './core/blockchain';
import { shopifyAdapter } from './adapters/shopify';
import { wooCommerceAdapter } from './adapters/woocommerce';

async function verify() {
  console.log('--- PROJECT SOUN VERIFICATION ---');

  // Initialize systems
  await registry.initialize();
  await agentRegistry.initialize();
  await paymentSystem.initialize();

  // 0. Agent Identity Registration
  console.log('\n[0] Registering AI Agent Identity...');
  const agent = await agentRegistry.register({
    name: 'Soun Explorer 1',
    organization: 'OpenAI Research'
  });
  console.log('   Agent Identity Created:', agent.agent_id);

  // 1. Registration with Schema
  console.log('\n[1] Registering Food Service Action with JSON Schema...');
  const foodAction = await registry.register({
    name: 'order_food',
    provider: 'food_service',
    description: 'Order your favorite food from local restaurants',
    parameters: {
      type: 'object',
      properties: {
        item: { type: 'string', description: 'The food item to order' },
        quantity: { type: 'number', description: 'How many to order', default: 1 }
      },
      required: ['item']
    },
    handler: async (input: any) => {
      console.log('   Internal Handler: Processing order for', input.item, 'x', input.quantity || 1);
      return { order_id: 'ord_12345', eta: '30 mins' };
    }
  });
  console.log('   Action Registered:', foodAction.action_id);

  // 1b. AI Tool Export
  console.log('\n[1b] Exporting Actions as AI Tools (OpenAI/Claude format):');
  console.log(JSON.stringify(registry.getActionsAsTools(), null, 2));

  // 2. Search (Discovery)
  console.log('\n[2] Searching for intent: "I want to order food"');
  const searchResults = await registry.search({
    intent: 'I want to order food',
    context: { location: 'New York' }
  });
  console.log('   Search Results:', JSON.stringify(searchResults, null, 2));

  // 3. Execution
  if (searchResults.length > 0) {
    const selectedActionId = searchResults[0].action_id;
    console.log(`\n[3] Executing Action: ${selectedActionId} (as ${agent.agent_id})`);
    const response = await executionEngine.execute(selectedActionId, { item: 'Pizza', quantity: 2 }, 'I want to order food', {
      agent_id: agent.agent_id,
      retries: 1,
      fallback: true
    });
    console.log('   Execution Response:', JSON.stringify(response, null, 2));
  }

  // 4. External Execution (Mocking Provider Sim)
  console.log('\n[4] Registering External Ride Service...');
  const rideAction = await registry.register({
    name: 'book_cab',
    provider: 'external_ride_service',
    execution_url: 'http://localhost:4000/book',
    description: 'Book a ride through an external provider'
  });
  console.log('   External Action Registered:', rideAction.action_id);

  console.log('\n[5] Executing External Action: book_cab');
  try {
    const response = await executionEngine.execute(rideAction.action_id, { destination: 'Airport' }, 'book a cab');
    console.log('   External Execution Response:', JSON.stringify(response, null, 2));
  } catch (err) {
    console.log('   External Execution failed (is provider-sim running?):', err);
  }

  // 5b. Distributed Network (Peers)
  console.log('\n[5b] Node Network Discovery:');
  console.log('   Local Node ID:', registry.getNodeId());
  await registry.registerPeer({
    id: 'peer_node_beta',
    url: 'http://localhost:3002',
    status: 'online',
    last_seen: Date.now(),
    capabilities: ['food', 'travel']
  });
  console.log('   Registered 1 peer. Total peers:', registry.getPeers().length);

  // 5c. E-commerce Platform Integration
  console.log('\n[5c] E-commerce Platform Registration (Shopify & WooCommerce):');
  
  const shopifyAction = await registry.register({
    name: 'shopify_create_order',
    provider: 'shopify_store_main',
    description: 'Create a new order directly in Shopify',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        quantity: { type: 'number', minimum: 1 },
        customer_email: { type: 'string', format: 'email' }
      },
      required: ['product_id', 'quantity', 'customer_email']
    },
    handler: async (input) => shopifyAdapter.createOrder(input)
  });
  console.log('   Shopify Action Registered:', shopifyAction.action_id);

  const wooAction = await registry.register({
    name: 'woo_create_order',
    provider: 'woo_store_alpha',
    description: 'Create a new order in WooCommerce',
    parameters: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        quantity: { type: 'number' }
      },
      required: ['sku', 'quantity']
    },
    handler: async (input) => wooCommerceAdapter.createOrder(input)
  });
  console.log('   WooCommerce Action Registered:', wooAction.action_id);

  console.log('\n[5d] Executing Shopify Order Action...');
  const shopifyRes = await executionEngine.execute(shopifyAction.action_id, {
    product_id: 'prod_999',
    quantity: 2,
    customer_email: 'ai.agent@soun.io'
  });
  console.log('   Shopify Execution Response:', JSON.stringify(shopifyRes, null, 2));

  // 6. Verification of Trust/Metrics
  console.log('\n[6] System Metrics & Trust:');
  const action = registry.getAction(foodAction.action_id);
  console.log('   Action Trust Score:', action?.trust_score);
  console.log('   System Metrics:', JSON.stringify(loggingSystem.getMetrics(), null, 2));

  // 7. Blockchain Verification
  console.log('\n[7] Blockchain Ledger Verification:');
  console.log('   Chain Valid:', blockchain.isChainValid());
  console.log('   Current Block Height:', blockchain.getChain().length);
  const agentWallet = paymentSystem.getOrCreateWallet(agent.agent_id);
  console.log(`   Agent ${agent.agent_id} Balance: ${agentWallet.balance} SOUN`);
  console.log('   Latest Transactions:', JSON.stringify(agentWallet.transactions.slice(-2), null, 2));

  console.log('\n--- VERIFICATION COMPLETE ---');
}

verify().catch(err => console.error('Verification failed:', err));

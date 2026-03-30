import { registry } from './core/registry';
import { agentRegistry } from './core/agent-registry';
import { executionEngine } from './core/execution-engine';
import { paymentSystem } from './core/payment-system';
import { messagingProtocol } from './core/messaging';
import { realWorldProvider } from './providers/real-world';

/**
 * SIMULATION: An Autonomous AI Agent using Project SOUN
 * 
 * Goal: The agent needs to "notify the admin that the system is ready".
 * Flow:
 * 1. Agent understands user intent.
 * 2. Agent searches SOUN for a "notification" tool.
 * 3. Agent selects the best tool based on trust and schema.
 * 4. Agent executes the tool using its own DID and credits.
 */

async function runAutonomousAgent() {
  console.log('🤖 [AGENT] Initializing Autonomous Agent...');
  
  // 1. Setup Systems
  await Promise.all([
    registry.initialize(),
    agentRegistry.initialize(),
    paymentSystem.initialize(),
    messagingProtocol.initialize()
  ]);

  // 2. Identity: Register the Agent
  const agent = await agentRegistry.register({
    name: 'AutoBot-9000',
    organization: 'Autonomous Mesh'
  });
  console.log(`🤖 [AGENT] Identity confirmed: ${agent.agent_id}`);

  // 3. Register a "Real" Capability (Simulation of a provider joining)
  console.log('\n📡 [NETWORK] A new provider "NotifyService" is joining the network...');
  const notifyAction = await registry.register({
    name: 'send_notification',
    provider: 'global_notify_inc',
    description: 'Send a secure notification to a specific channel',
    parameters: {
      type: 'object',
      properties: {
        channel: { type: 'string', enum: ['email', 'slack', 'sms'] },
        message: { type: 'string', minLength: 5 },
        priority: { type: 'string', enum: ['low', 'high'], default: 'low' }
      },
      required: ['channel', 'message']
    },
    cost: 25, // Costs 25 SOUN
    handler: async (input) => {
      console.log(`   [REAL WORLD] Dispatching ${input.priority} priority message to ${input.channel}: "${input.message}"`);
      return { success: true, timestamp: new Date().toISOString(), ref: 'MSG-882' };
    }
  });

  // 4. THE AGENT LOOP
  const userRequest = "Notify the admin via Slack that the SOUN protocol is fully operational and ready for deployment. Set priority to high.";
  console.log(`\n💬 [USER] Request: "${userRequest}"`);

  // Step A: Search for tools
  console.log('🤖 [AGENT] Searching for compatible tools in the SOUN network...');
  const searchResults = await registry.search({ intent: 'notify admin slack' });
  
  if (searchResults.length === 0) {
    console.log('🤖 [AGENT] No compatible tools found. Terminating.');
    return;
  }

  // Step B: Select and Evaluate (Picking the first one - top ranked by Trust/Relevance)
  const tool = searchResults[0];
  console.log(`🤖 [AGENT] Selected Tool: ${tool.name} (Trust: ${tool.trust_score * 100}%)`);

  // Step C: Construct Parameters (Simulated LLM Reasoning)
  const parameters = {
    channel: 'slack',
    message: 'The SOUN protocol is fully operational and ready for deployment.',
    priority: 'high'
  };

  // Step D: Execute via SOUN
  console.log(`🤖 [AGENT] Executing task as ${agent.agent_id}...`);
  const response = await executionEngine.execute(tool.action_id, parameters, 'notify admin slack', {
    agent_id: agent.agent_id,
    retries: 2,
    fallback: true
  });

  // 5. Outcome Processing
  if (response.status === 'success') {
    console.log('\n✅ [AGENT] Task completed successfully!');
    console.log('🤖 [AGENT] Result from Soun:', JSON.stringify(response.data, null, 2));
    
    // Check Wallet
    const wallet = await paymentSystem.getOrCreateWallet(agent.agent_id);
    console.log(`🤖 [AGENT] Remaining Wallet Balance: ${wallet.balance} SOUN`);
  } else {
    console.log('\n❌ [AGENT] Task failed:', response.message);
  }

  // 6. A2A Messaging: Simulation of subcontracting
  console.log('\n💬 [AGENT] Task requires subcontracting. Messaging another agent...');
  const subAgent = await agentRegistry.register({ name: 'SubContractor-1', organization: 'Autonomous Mesh' });
  
  await messagingProtocol.sendMessage(agent.agent_id, {
    to_did: subAgent.agent_id,
    subject: 'Resource Verification',
    body: { task_id: 'SOUN-123', status: 'requesting_verification' }
  });
  
  const notifyInbox = messagingProtocol.getInbox(subAgent.agent_id);
  console.log(`🤖 [SUB-AGENT] Received message: "${notifyInbox[0].subject}" from ${notifyInbox[0].from_did}`);

  // 7. REAL WORLD: Open-loop execution (Step 4 of Phase 3)
  console.log('\n🎯 [REALITY] Testing real-world open-loop execution...');
  const webhookAction = await registry.register({
    name: 'trigger_webhook',
    provider: 'external_webhook_service',
    description: 'Trigger a real-world external webhook',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        payload: { type: 'object' }
      },
      required: ['url']
    },
    cost: 50,
    handler: async (input) => realWorldProvider.triggerWebhook(input)
  });

  console.log('🤖 [AGENT] Executing real-world webhook (Open-Loop)...');
  // We use a mock URL that will fail or a real one if provided. 
  // For the demo, we'll use a local mock to ensure it doesn't break without internet.
  const realRes = await executionEngine.execute(webhookAction.action_id, {
    url: 'http://httpbin.org/post', // Real public testing endpoint
    payload: { agent_status: 'operational', protocol: 'SOUN v2.1' }
  }, 'trigger webhook', { agent_id: agent.agent_id });

  if (realRes.status === 'success') {
    console.log('✅ [REALITY] Real-world execution succeeded!');
    console.log('🤖 [AGENT] Remote Response Status:', realRes.data.remote_response);
  }

  console.log('\n🏁 [AGENT] Agent loop finished.');
}

runAutonomousAgent().catch(console.error);

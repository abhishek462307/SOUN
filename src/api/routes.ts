import express, { Request, Response, NextFunction } from 'express';
import { registry } from '../core/registry';
import { executionEngine } from '../core/execution-engine';
import { loggingSystem } from '../core/logging-system';
import { authService } from '../core/auth';
import { Intent } from '../models/intent';
import { ExecutionRequest } from '../models/response';
import { websiteCrawler } from '../core/crawler';
import { agentRegistry } from '../core/agent-registry';
import { paymentSystem } from '../core/payment-system';
import { blockchain } from '../core/blockchain';
import { messagingProtocol } from '../core/messaging';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const router = express.Router();

// 1.0 Rate Limiting per API Key
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each key to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const apiKey = req.headers['x-soun-api-key'] as string;
    if (apiKey) return apiKey;
    return ipKeyGenerator(req.ip || 'anonymous');
  },
  message: { error: 'Too many requests, please try again later.' }
});

// 1.1 Auth Middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-soun-api-key'] as string;
  if (!apiKey || !authService.isValid(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-SOUN-API-KEY' });
  }
  next();
};

// Apply rate limiting to all routes
router.use(limiter);

/**
 * @openapi
 * /api/public/actions:
 *   get:
 *     summary: Public discovery of available actions (No Auth)
 *     responses:
 *       200:
 *         description: List of actions available for discovery
 */
router.get('/public/actions', (req: Request, res: Response) => {
  const actions = registry.getAllActions().map(a => ({
    name: a.name,
    description: a.description,
    provider: a.provider,
    cost: a.cost,
    trust_score: a.trust_score
  }));
  res.json({ actions });
});

// Apply auth to all subsequent routes
router.use(authMiddleware);

/**
 * @openapi
 * /api/register-action:
 *   post:
 *     summary: Register a new action
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, provider]
 *             properties:
 *               name: { type: string }
 *               provider: { type: string }
 *               execution_url: { type: string }
 *               description: { type: string }
 *               parameters: { type: object }
 *     responses:
 *       201:
 *         description: Action registered
 */
router.post('/register-action', async (req: Request, res: Response) => {
  try {
    const { name, provider, execution_url, description, parameters, returns } = req.body;
    if (!name || !provider) {
      return res.status(400).json({ error: 'Name and provider are required' });
    }
    const action = await registry.register({ name, provider, execution_url, description, parameters, returns });
    res.status(201).json(action);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/search:
 *   post:
 *     summary: Search for actions based on intent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [intent]
 *             properties:
 *               intent: { type: string }
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const intent: Intent = req.body;
    if (!intent || !intent.intent) {
      return res.status(400).json({ error: 'Intent is required' });
    }
    const results = await registry.search(intent);
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/register-agent:
 *   post:
 *     summary: Register a new AI Agent identity
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               organization: { type: string }
 *               public_key: { type: string }
 *     responses:
 *       201:
 *         description: Agent registered
 */
router.post('/register-agent', async (req: Request, res: Response) => {
  try {
    const { name, organization, public_key } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const agent = await agentRegistry.register({ name, organization, public_key });
    const apiKey = authService.generateKey(agent.agent_id);
    
    res.status(201).json({ agent, apiKey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/agents:
 *   get:
 *     summary: Get all registered AI Agents
 *     responses:
 *       200:
 *         description: List of agents
 */
router.get('/agents', (req: Request, res: Response) => {
  res.json({ agents: agentRegistry.getAllAgents() });
});

/**
 * @openapi
 * /api/execute/{action_id}:
 *   post:
 *     summary: Execute an action
 *     parameters:
 *       - name: action_id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               input: { type: object }
 *     responses:
 *       200:
 *         description: Execution response
 */
router.post('/execute/:action_id', async (req: Request, res: Response) => {
  try {
    const { action_id } = req.params;
    const { input, intent } = req.body;
    
    // Get agent ID from auth middleware context (via headers)
    const apiKey = req.headers['x-soun-api-key'] as string;
    const agentId = authService.getAgentId(apiKey);
    
    const response = await executionEngine.execute(action_id, input, intent, {
      retries: 1,
      fallback: true,
      agent_id: agentId
    });
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Extra: Get metrics
router.get('/metrics', (req: Request, res: Response) => {
  res.json(loggingSystem.getMetrics());
});

// Extra: Get all actions (for dashboard)
router.get('/actions', (req: Request, res: Response) => {
  res.json({ actions: registry.getAllActions() });
});

// Extra: Get all logs (for dashboard)
router.get('/logs', (req: Request, res: Response) => {
  res.json({ logs: loggingSystem.getLogs() });
});

// 7.1 Distributed Handshake: GET /peers
router.get('/peers', (req: Request, res: Response) => {
  res.json({ 
    node_id: registry.getNodeId(),
    peers: registry.getPeers() 
  });
});

// 7.2 Join Network: POST /join
router.post('/join', async (req: Request, res: Response) => {
  const { id, url, capabilities } = req.body;
  if (!id || !url) {
    return res.status(400).json({ error: 'Peer ID and URL are required' });
  }
  await registry.registerPeer({ 
    id, 
    url, 
    capabilities: capabilities || [], 
    status: 'online', 
    last_seen: Date.now() 
  });
  res.json({ status: 'joined', node_id: registry.getNodeId() });
});

/**
 * @openapi
 * /api/crawl:
 *   post:
 *     summary: Discover and register actions from a website's soun.json
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url: { type: string, description: 'The root URL of the website' }
 *     responses:
 *       200:
 *         description: Discovery results
 */
router.post('/crawl', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  
  const result = await websiteCrawler.crawl(url);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

/**
 * @openapi
 * /api/wallet:
 *   get:
 *     summary: Get agent wallet and transaction history
 *     responses:
 *       200:
 *         description: Wallet details
 */
router.get('/wallet', async (req: Request, res: Response) => {
  const apiKey = req.headers['x-soun-api-key'] as string;
  const agentId = authService.getAgentId(apiKey);
  
  if (!agentId) return res.status(401).json({ error: 'Agent not identified' });
  
  const wallet = await paymentSystem.getOrCreateWallet(agentId);
  res.json(wallet);
});

/**
 * @openapi
 * /api/handshake:
 *   post:
 *     summary: Self-onboarding handshake for agents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agent_name]
 *             properties:
 *               agent_name: { type: string }
 *               organization: { type: string }
 *     responses:
 *       200:
 *         description: Handshake successful, agent onboarded
 */
router.post('/handshake', async (req: Request, res: Response) => {
  try {
    const { agent_name, organization } = req.body;
    if (!agent_name) return res.status(400).json({ error: 'agent_name is required' });

    // Automated onboarding logic
    const agent = await agentRegistry.register({ 
      name: agent_name, 
      organization: organization || 'Autonomous Mesh' 
    });
    
    // Provide initial "gas" reward on blockchain for self-onboarded agents
    const wallet = await paymentSystem.getOrCreateWallet(agent.agent_id);

    // Generate credentials (after DID is established)
    const apiKey = authService.generateKey(agent.agent_id);

    res.json({
      status: 'onboarded',
      identity: agent,
      credentials: {
        apiKey,
        did: agent.agent_id
      },
      welcome_package: {
        initial_balance: wallet.balance,
        currency: wallet.currency,
        message: 'Welcome to the SOUN Autonomous Mesh.'
      },
      network_manifest: '/.soun'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/messages:
 *   get:
 *     summary: Get agent inbox
 *     responses:
 *       200:
 *         description: Inbox messages
 */
router.get('/messages', (req: Request, res: Response) => {
  const apiKey = req.headers['x-soun-api-key'] as string;
  const agentId = authService.getAgentId(apiKey);
  if (!agentId) return res.status(401).json({ error: 'Agent not identified' });
  
  res.json({ inbox: messagingProtocol.getInbox(agentId) });
});

/**
 * @openapi
 * /api/messages/send:
 *   post:
 *     summary: Send message to another agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to_did, subject, body]
 *             properties:
 *               to_did: { type: string }
 *               subject: { type: string }
 *               body: { type: object }
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post('/messages/send', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-soun-api-key'] as string;
    const fromDid = authService.getAgentId(apiKey);
    if (!fromDid) return res.status(401).json({ error: 'Agent not identified' });

    const message = await messagingProtocol.sendMessage(fromDid, req.body);
    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Extra: Get all messages (for dashboard)
router.get('/all-messages', (req: Request, res: Response) => {
  // This would be admin-only in prod
  res.json({ messages: messagingProtocol.getInbox('all') || [] });
});

// Extra: Get all wallets (for dashboard)
router.get('/wallets', (req: Request, res: Response) => {
  res.json({ wallets: paymentSystem.getAllWallets() });
});

// Extra: Get blockchain (for dashboard explorer)
router.get('/blockchain', (req: Request, res: Response) => {
  res.json({
    chain: blockchain.getChain(),
    pending: blockchain.getPendingTransactions(),
    isValid: blockchain.isChainValid()
  });
});

// AI Agent specific: Get actions as Tools (OpenAI/Claude format)
router.get('/tools', (req: Request, res: Response) => {
  res.json({ tools: registry.getActionsAsTools() });
});

export default router;

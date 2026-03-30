import express from 'express';
import apiRoutes from './api/routes';
import { SOUN_MANIFEST } from './core/discovery';
import { registry } from './core/registry';
import { agentRegistry } from './core/agent-registry';
import { paymentSystem } from './core/payment-system';
import { messagingProtocol } from './core/messaging';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const app = express();
const port = process.env.PORT || 3001;

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PROJECT SOUN API',
      version: '1.0.0',
      description: 'Universal Execution Protocol for AI Agents'
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-SOUN-API-KEY'
        }
      }
    },
    security: [{ ApiKeyAuth: [] }]
  },
  apis: ['./src/api/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.json());
app.use(express.static('public'));

// 7.1 System Manifest (Discovery)
app.get('/.soun', (req, res) => {
  res.json(SOUN_MANIFEST);
});

// Documentation/Welcome
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SOUN (Semantic Orchestration & Universal Network) API (v1.0)',
    discovery: '/.soun',
    endpoints: SOUN_MANIFEST.endpoints
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

async function start() {
  await Promise.all([
    registry.initialize(),
    agentRegistry.initialize(),
    paymentSystem.initialize(),
    messagingProtocol.initialize()
  ]);
  app.listen(port, () => {
    console.log(`[SOUN] Semantic Orchestration & Universal Network is running on port ${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

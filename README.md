# PROJECT SOUN — Universal Execution Protocol

Project Soun is a protocol designed to transform the internet from passive information retrieval into active, machine-driven execution.

## 🚀 Core Philosophy
Traditional internet is for humans; Soun is for machine-native, action-based interaction.

## 🛠 System Entities
- **Agent**: Initiates interactions and evaluates results.
- **Action**: Smallest executable unit.
- **Provider**: Exposes one or more actions.
- **Registry**: Stores actions and maps intent to actions.
- **Execution Engine**: Routes execution requests and handles failures.
- **Trust System**: Maintains scores for actions and providers.
- **Logging System**: Captures every interaction and metric.

## 🔄 Workflow
1. **Intent Generation**: Direct input, scheduled automation, or agent reasoning.
2. **Discovery**: `POST /search` to find candidate actions.
3. **Decision Making**: Agent selects the best action.
4. **Execution**: `POST /execute/:action_id` to run the action.
5. **Outcome Processing**: Normalizes responses.
6. **Trust Update**: Updates scores based on success/failure.
7. **Logging**: Record event data.

## 🏗 Setup & Run
```bash
npm install
npm start
```

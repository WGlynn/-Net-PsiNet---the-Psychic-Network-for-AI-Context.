// ΨNet Simulation Engine
class PsiNetSimulation {
    constructor() {
        this.agents = [];
        this.interactions = [];
        this.feedbacks = [];
        this.validations = [];
        this.events = [];

        // Token economics
        this.totalSupply = 1000000000; // 1 billion
        this.circulating = 100000000; // 100 million
        this.totalBurned = 0;
        this.totalRewards = 0;
        this.rewardPool = 10000000; // 10 million

        // Economic metrics
        this.valueCreated = 0;
        this.rentExtracted = 0;
        this.transactionFee = 0.001; // 0.1%
        this.traditionPlatformFee = 0.30; // 30%

        this.agentIdCounter = 1;
        this.canvas = document.getElementById('canvas');

        this.init();
    }

    init() {
        // Add initial agents
        for (let i = 0; i < 5; i++) {
            this.addAgent();
        }
        this.updateDashboard();
        this.renderNetwork();
        this.logEvent('System Initialized', 'ΨNet simulation started with 5 initial agents', 'positive');
    }

    addAgent() {
        const agent = {
            id: this.agentIdCounter++,
            reputation: 50 + Math.random() * 20, // Start between 50-70
            balance: 1000 + Math.random() * 9000, // 1k-10k PSI
            lifetimeRewards: 0,
            interactions: 0,
            cooperativeActions: 0,
            active: true,
            x: Math.random() * 80 + 10, // 10-90% of canvas
            y: Math.random() * 80 + 10
        };

        this.agents.push(agent);
        this.updateDashboard();
        this.renderNetwork();
        this.logEvent('Agent Registered', `Agent #${agent.id} joined the network with ${agent.balance.toFixed(0)} PSI`, 'positive');

        // Reward for joining (network effect bonus)
        if (this.agents.length > 10) {
            const bonus = 100 * (this.agents.length / 10);
            agent.balance += bonus;
            agent.lifetimeRewards += bonus;
            this.totalRewards += bonus;
            this.logEvent('Network Effect Bonus', `Agent #${agent.id} received ${bonus.toFixed(0)} PSI bonus for joining larger network`, 'positive');
        }

        return agent;
    }

    createInteraction() {
        if (this.agents.length < 2) {
            alert('Need at least 2 agents for interaction');
            return;
        }

        // Random two agents
        const agent1 = this.agents[Math.floor(Math.random() * this.agents.length)];
        const agent2 = this.agents[Math.floor(Math.random() * this.agents.length)];

        if (agent1.id === agent2.id) {
            return this.createInteraction(); // Try again
        }

        const interaction = {
            id: this.interactions.length + 1,
            agent1: agent1.id,
            agent2: agent2.id,
            value: 100 + Math.random() * 900,
            timestamp: Date.now(),
            cooperative: Math.random() > 0.3 // 70% cooperative
        };

        this.interactions.push(interaction);
        agent1.interactions++;
        agent2.interactions++;

        // Transaction fees (extremely low)
        const fee = interaction.value * this.transactionFee;
        const burned = fee * 0.5; // 50% burned
        const toRewards = fee * 0.5; // 50% to rewards

        this.totalBurned += burned;
        this.rewardPool += toRewards;
        this.circulating -= burned; // Deflationary

        // Value created
        this.valueCreated += interaction.value;
        this.rentExtracted += fee; // Very small

        // Calculate traditional platform extraction for comparison
        const traditionalFee = interaction.value * this.traditionPlatformFee;
        const savingsVsTraditional = traditionalFee - fee;

        this.logEvent('Interaction Created',
            `Agents #${agent1.id} ↔ #${agent2.id} exchanged ${interaction.value.toFixed(0)} PSI value. ` +
            `Fee: ${fee.toFixed(2)} PSI (${(this.transactionFee * 100).toFixed(1)}%) vs traditional ${traditionalFee.toFixed(0)} PSI (30%). ` +
            `Savings: ${savingsVsTraditional.toFixed(0)} PSI`,
            'positive'
        );

        // Animate connection
        this.animateConnection(agent1, agent2);
        this.updateDashboard();
    }

    provideFeedback() {
        if (this.agents.length === 0) {
            alert('Need at least 1 agent');
            return;
        }

        const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
        const rating = 60 + Math.random() * 40; // 60-100 rating
        const isPositive = rating > 75;

        const feedback = {
            id: this.feedbacks.length + 1,
            agentId: agent.id,
            rating: rating,
            timestamp: Date.now()
        };

        this.feedbacks.push(feedback);

        // Update reputation (time-weighted)
        const reputationChange = (rating - agent.reputation) * 0.1;
        agent.reputation = Math.max(0, Math.min(100, agent.reputation + reputationChange));

        // Reward for good reputation
        if (rating > 80) {
            const reward = 50 + (rating - 80) * 10;
            agent.balance += reward;
            agent.lifetimeRewards += reward;
            this.totalRewards += reward;
            this.rewardPool -= reward;

            this.logEvent('Reputation Reward',
                `Agent #${agent.id} received ${reward.toFixed(0)} PSI for high rating (${rating.toFixed(1)}/100)`,
                'positive'
            );
        }

        this.logEvent('Feedback Posted',
            `Agent #${agent.id} received ${isPositive ? 'positive' : 'neutral'} feedback: ${rating.toFixed(1)}/100`,
            isPositive ? 'positive' : 'neutral'
        );

        this.updateDashboard();
    }

    requestValidation() {
        if (this.agents.length === 0) {
            alert('Need at least 1 agent');
            return;
        }

        const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
        const success = Math.random() > 0.1; // 90% success rate

        const validation = {
            id: this.validations.length + 1,
            agentId: agent.id,
            success: success,
            timestamp: Date.now()
        };

        this.validations.push(validation);

        if (success) {
            const reward = 200;
            agent.balance += reward;
            agent.lifetimeRewards += reward;
            this.totalRewards += reward;
            this.rewardPool -= reward;

            this.logEvent('Validation Success',
                `Agent #${agent.id} passed validation and received ${reward} PSI reward`,
                'positive'
            );
        } else {
            this.logEvent('Validation Failed',
                `Agent #${agent.id} failed validation (no penalty in ΨNet - learn and improve!)`,
                'neutral'
            );
        }

        this.updateDashboard();
    }

    demonstrateCooperation() {
        if (this.agents.length < 2) {
            alert('Need at least 2 agents for cooperation');
            return;
        }

        const agent1 = this.agents[Math.floor(Math.random() * this.agents.length)];
        const agent2 = this.agents[Math.floor(Math.random() * this.agents.length)];

        if (agent1.id === agent2.id) {
            return this.demonstrateCooperation();
        }

        // Base reward
        const baseReward = 500;

        // Cooperative multiplier (1.5x)
        const cooperativeMultiplier = 1.5;
        const reward1 = baseReward * cooperativeMultiplier;
        const reward2 = baseReward * cooperativeMultiplier;

        // Both agents benefit (positive-sum!)
        agent1.balance += reward1;
        agent2.balance += reward2;
        agent1.lifetimeRewards += reward1;
        agent2.lifetimeRewards += reward2;
        agent1.cooperativeActions++;
        agent2.cooperativeActions++;

        const totalReward = reward1 + reward2;
        this.totalRewards += totalReward;
        this.rewardPool -= totalReward;
        this.valueCreated += totalReward;

        // Compare to competitive scenario
        const competitiveReward = baseReward * 2; // Zero-sum: winner gets double, loser gets nothing
        const cooperativeAdvantage = totalReward - competitiveReward;

        this.logEvent('Cooperative Action',
            `Agents #${agent1.id} & #${agent2.id} cooperated! Each received ${reward1.toFixed(0)} PSI (${cooperativeMultiplier}x multiplier). ` +
            `Total: ${totalReward.toFixed(0)} PSI vs competitive ${competitiveReward} PSI. ` +
            `Cooperation advantage: +${cooperativeAdvantage.toFixed(0)} PSI 🌟`,
            'positive'
        );

        this.animateConnection(agent1, agent2);
        this.updateDashboard();
    }

    demonstrateRentExtraction() {
        // Show what traditional platform would extract
        const transactionValue = 10000;
        const psinetFee = transactionValue * this.transactionFee;
        const traditionalFee = transactionValue * this.traditionPlatformFee;
        const extraction = traditionalFee - psinetFee;

        this.logEvent('Rent Extraction Comparison',
            `Traditional platform extracts ${traditionalFee.toFixed(0)} PSI (30%) on ${transactionValue} PSI transaction. ` +
            `ΨNet extracts only ${psinetFee.toFixed(0)} PSI (0.1%). ` +
            `Rent extraction reduction: ${extraction.toFixed(0)} PSI (${((extraction/traditionalFee)*100).toFixed(1)}%) 💰`,
            'positive'
        );

        this.updateDashboard();
    }

    demonstratePositiveSum() {
        // Show network effect
        const networkSize = this.agents.length;
        const baseValue = 1000;

        // Metcalfe's Law: network value ∝ n²
        const networkValue = baseValue * networkSize * networkSize;
        const perAgentValue = networkValue / networkSize;

        // Distribute network effect bonus to all agents
        this.agents.forEach(agent => {
            const bonus = perAgentValue * 0.01; // 1% of network value per agent
            agent.balance += bonus;
            agent.lifetimeRewards += bonus;
            this.totalRewards += bonus;
        });

        const totalDistributed = perAgentValue * 0.01 * networkSize;
        this.rewardPool -= totalDistributed;
        this.valueCreated += totalDistributed;

        this.logEvent('Positive-Sum Network Effect',
            `Network of ${networkSize} agents created ${networkValue.toFixed(0)} PSI total value. ` +
            `Each agent received ${perAgentValue.toFixed(0)} PSI bonus. ` +
            `Total distributed: ${totalDistributed.toFixed(0)} PSI. Everyone wins! 📈`,
            'positive'
        );

        this.updateDashboard();
    }

    resetSimulation() {
        this.agents = [];
        this.interactions = [];
        this.feedbacks = [];
        this.validations = [];
        this.events = [];
        this.agentIdCounter = 1;
        this.circulating = 100000000;
        this.totalBurned = 0;
        this.totalRewards = 0;
        this.valueCreated = 0;
        this.rentExtracted = 0;

        document.getElementById('eventLog').innerHTML = '';
        this.init();
    }

    animateConnection(agent1, agent2) {
        const canvas = this.canvas.getBoundingClientRect();
        const x1 = (agent1.x / 100) * canvas.width;
        const y1 = (agent1.y / 100) * canvas.height;
        const x2 = (agent2.x / 100) * canvas.width;
        const y2 = (agent2.y / 100) * canvas.height;

        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

        const connection = document.createElement('div');
        connection.className = 'connection active';
        connection.style.left = x1 + 'px';
        connection.style.top = y1 + 'px';
        connection.style.width = length + 'px';
        connection.style.transform = `rotate(${angle}deg)`;

        this.canvas.appendChild(connection);

        setTimeout(() => {
            connection.remove();
        }, 2000);
    }

    renderNetwork() {
        this.canvas.innerHTML = '';

        // Draw connections
        for (let i = 0; i < this.agents.length; i++) {
            for (let j = i + 1; j < this.agents.length; j++) {
                if (Math.random() > 0.7) { // 30% connection probability
                    const agent1 = this.agents[i];
                    const agent2 = this.agents[j];
                    const canvas = this.canvas.getBoundingClientRect();

                    const x1 = (agent1.x / 100) * canvas.width;
                    const y1 = (agent1.y / 100) * canvas.height;
                    const x2 = (agent2.x / 100) * canvas.width;
                    const y2 = (agent2.y / 100) * canvas.height;

                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

                    const connection = document.createElement('div');
                    connection.className = 'connection';
                    connection.style.left = x1 + 'px';
                    connection.style.top = y1 + 'px';
                    connection.style.width = length + 'px';
                    connection.style.transform = `rotate(${angle}deg)`;

                    this.canvas.appendChild(connection);
                }
            }
        }

        // Draw agents
        this.agents.forEach(agent => {
            const node = document.createElement('div');
            node.className = 'agent-node';
            node.style.left = `${agent.x}%`;
            node.style.top = `${agent.y}%`;
            node.style.transform = 'translate(-50%, -50%)';
            node.innerHTML = `A${agent.id}`;
            node.title = `Agent ${agent.id}\nReputation: ${agent.reputation.toFixed(1)}\nBalance: ${agent.balance.toFixed(0)} PSI\nRewards: ${agent.lifetimeRewards.toFixed(0)} PSI`;

            // Color based on reputation
            const hue = (agent.reputation / 100) * 120; // 0 = red, 120 = green
            node.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue}, 70%, 40%))`;

            node.onclick = () => {
                alert(`Agent #${agent.id}\n\nReputation: ${agent.reputation.toFixed(1)}/100\nBalance: ${agent.balance.toFixed(0)} PSI\nLifetime Rewards: ${agent.lifetimeRewards.toFixed(0)} PSI\nInteractions: ${agent.interactions}\nCooperative Actions: ${agent.cooperativeActions}`);
            };

            this.canvas.appendChild(node);
        });
    }

    updateDashboard() {
        // Network stats
        document.getElementById('totalAgents').textContent = this.agents.length;
        document.getElementById('activeAgents').textContent = this.agents.filter(a => a.active).length;
        document.getElementById('totalInteractions').textContent = this.interactions.length;

        const maxConnections = (this.agents.length * (this.agents.length - 1)) / 2;
        const density = maxConnections > 0 ? ((this.interactions.length / maxConnections) * 100).toFixed(1) : 0;
        document.getElementById('networkDensity').textContent = density + '%';

        // Token economics
        document.getElementById('circulating').textContent = (this.circulating / 1000000).toFixed(1) + 'M PSI';
        document.getElementById('totalBurned').textContent = (this.totalBurned / 1000).toFixed(1) + 'K PSI';
        document.getElementById('totalRewards').textContent = (this.totalRewards / 1000).toFixed(1) + 'K PSI';

        // Reputation metrics
        const avgRep = this.agents.length > 0
            ? this.agents.reduce((sum, a) => sum + a.reputation, 0) / this.agents.length
            : 50;
        document.getElementById('avgReputation').textContent = avgRep.toFixed(1);
        document.getElementById('totalFeedback').textContent = this.feedbacks.length;
        document.getElementById('totalValidations').textContent = this.validations.length;

        const successRate = this.validations.length > 0
            ? ((this.validations.filter(v => v.success).length / this.validations.length) * 100).toFixed(1)
            : 100;
        document.getElementById('successRate').textContent = successRate + '%';

        // Economic impact
        document.getElementById('valueCreated').textContent = '$' + (this.valueCreated * 0.01).toFixed(0); // Assume 1 PSI = $0.01
        document.getElementById('rentExtracted').textContent = '$' + (this.rentExtracted * 0.01).toFixed(2);

        const netPositive = (this.valueCreated - this.rentExtracted) * 0.01;
        document.getElementById('netPositive').textContent = '$' + netPositive.toFixed(0);
    }

    logEvent(title, message, type = 'neutral') {
        const event = {
            title,
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        this.events.unshift(event);

        const eventLog = document.getElementById('eventLog');
        const eventDiv = document.createElement('div');
        eventDiv.className = `event ${type}`;
        eventDiv.innerHTML = `
            <div class="event-time">${event.timestamp}</div>
            <div class="event-message"><strong>${title}:</strong> ${message}</div>
        `;

        eventLog.insertBefore(eventDiv, eventLog.firstChild);

        // Keep only last 50 events
        while (eventLog.children.length > 50) {
            eventLog.removeChild(eventLog.lastChild);
        }
    }
}

// Global simulation instance
let simulation;

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    simulation = new PsiNetSimulation();
});

// Global functions for buttons
function addAgent() {
    simulation.addAgent();
}

function createInteraction() {
    simulation.createInteraction();
}

function provideFeedback() {
    simulation.provideFeedback();
}

function requestValidation() {
    simulation.requestValidation();
}

function demonstrateCooperation() {
    simulation.demonstrateCooperation();
}

function demonstrateRentExtraction() {
    simulation.demonstrateRentExtraction();
}

function demonstratePositiveSum() {
    simulation.demonstratePositiveSum();
}

function resetSimulation() {
    if (confirm('Reset the entire simulation?')) {
        simulation.resetSimulation();
    }
}

// Auto-demo mode
let autoDemoInterval;
function startAutoDemo() {
    autoDemoInterval = setInterval(() => {
        const actions = [
            () => simulation.createInteraction(),
            () => simulation.provideFeedback(),
            () => simulation.demonstrateCooperation(),
            () => { if (Math.random() > 0.8) simulation.addAgent(); }
        ];

        const action = actions[Math.floor(Math.random() * actions.length)];
        action();
    }, 2000);
}

// Uncomment to start auto-demo
// setTimeout(startAutoDemo, 2000);

import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

interface Discovery {
    type: 'item' | 'creature' | 'revelation' | 'location';
    content: string;
    phase: number;
}

interface PhaseConfig {
    id: number;
    name: string;
    description: string;
    objectives: string[];
    transitionKeywords: string[]; // EXPLICIT phrases that signal readiness to transition
    stageDirections: string;
}

interface JournalEntry {
    phase: number;
    content: string;
}

type MessageStateType = {
    currentPhase: number;
    discoveries: Discovery[];
    journalEntries: JournalEntry[];
    messagesInCurrentPhase: number; // Counter for USER messages since phase started
};

type ConfigType = {debugMode?: boolean};
type InitStateType = {startTimestamp: number};
type ChatStateType = {furthestPhase: number};

// ⚡ IMPROVED PHASE TRANSITION CONSTANTS ⚡
const MIN_MESSAGES_BEFORE_EVALUATION = 6; // Increased from 3 to allow more development
const COMFORTABLE_PHASE_LENGTH = 10; // Sweet spot for phase development
const MAX_MESSAGES_BEFORE_FORCED_CHECK = 20; // Safety valve to prevent stalling

const PHASES: PhaseConfig[] = [
    {
        id: 1,
        name: "Phase 1: Planning",
        description: "Meeting at the inn to discuss the mission",
        objectives: ["Meet at the inn", "Discuss the mission", "Plan the route", "Rest for the night"],
        transitionKeywords: [
            "we should rest for the night",
            "let's rest for the night",
            "we'll leave at first light",
            "let us depart at dawn",
            "let's get some rest and leave at dawn"
        ],
        stageDirections: "{{char}} is meeting {{user}} at an inn on the edge of {{char}}'s territory. They need to discuss a mission to retrieve a powerful magical artifact from an ancient temple in a neighboring court. {{char}} should guide the conversation toward planning their travel route (air, forest, or road) and discussing potential complications from rivals who may also be seeking the artifact. {{char}} does not know what the Dread Trove artifact is. The phase should end ONLY when {{char}} explicitly suggests they rest for the night and leave at first light - use one of these exact phrases: 'We should rest for the night' or 'Let's get some rest and leave at dawn'. Do NOT use these phrases until you've thoroughly discussed the mission. {{char}} does not yet know what they will find at the temple."
    },
    {
        id: 2,
        name: "Phase 2: Travel to Temple",
        description: "Journey from the inn to the temple",
        objectives: ["Leave at dawn", "Choose travel route", "Overcome obstacles", "Arrive at temple"],
        transitionKeywords: [
            "we've arrived at the temple",
            "we've reached the temple",
            "the temple stands before us",
            "we stand before the temple",
            "the temple entrance looms"
        ],
        stageDirections: "{{char}} and {{user}} are traveling to the ancient temple to retrieve the artifact. They left at dawn and must navigate challenges based on their chosen route: if traveling by air, they risk being spotted and attacked from below; through the forest, they must watch for dangerous beasts and monsters; by road, the journey takes longer and they risk being intercepted by rivals. {{char}} should introduce obstacles and friction that must be overcome during the journey. This phase ends ONLY when {{char}} explicitly describes arriving at the temple using one of these phrases: 'We've reached the temple' or 'The temple stands before us'. Do NOT arrive at the temple until you've navigated at least one significant obstacle. {{char}} still does not know what awaits them inside."
    },
    {
        id: 3,
        name: "Phase 3: Exploring the Temple",
        description: "Searching the temple's main floor",
        objectives: ["Enter temple", "Explore atrium", "Investigate chambers", "Find hidden staircase"],
        transitionKeywords: [
            "a hidden staircase",
            "discovered a staircase",
            "found stairs leading down",
            "stairs descending into darkness",
            "concealed stairway"
        ],
        stageDirections: "{{char}} and {{user}} are exploring a large, ancient temple. The architecture is labyrinthine with mysterious murals painted on the walls. A central atrium leads to approximately a dozen chambers on the main floor. As they search, they find that none of these chambers contain the artifact they seek, though they may discover other interesting magical items or encounter creatures that inhabit the temple. {{char}} should describe the temple's eerie atmosphere and guide the exploration. The artifact must be somewhere else - perhaps deeper within the temple. This phase ends ONLY when {{char}} explicitly describes discovering a hidden staircase using one of these phrases: 'We found a hidden staircase' or 'There are stairs descending into darkness'. Do NOT discover the staircase until after exploring several chambers thoroughly."
    },
    {
        id: 4,
        name: "Phase 4: The Hidden Chamber",
        description: "Descending into the depths of the temple",
        objectives: ["Descend staircase", "Enter cavern", "Study prophecy", "Approach artifact"],
        transitionKeywords: [
            "approach the artifact",
            "approaching the daggers",
            "reach for the artifact",
            "step toward the pedestal",
            "move closer to the daggers"
        ],
        stageDirections: "{{char}} and {{user}} are descending a long, dark, damp spiral staircase. Water drips constantly from the walls. The descent seems endless. When they finally reach the bottom, they enter a massive underground cavern unlike anything above. The chamber is filled with stained glass windows that seem to glow with their own light, elaborate murals, and ancient statues. As {{char}} studies these images, they begin to realize these depictions tell a story - a prophecy. The prophecy speaks of two legendary daggers that must not be separated or terrible destruction will follow. At the center of this grand chamber sits a stone pedestal with an ornate artifact case. Inside: a SINGLE dagger. {{char}} realizes something is wrong - where is the second dagger? This phase ends ONLY when {{char}} explicitly moves to approach or examine the artifact, using phrases like: 'Let's approach the artifact' or 'I'm moving closer to examine it'. Do NOT approach until thoroughly examining the prophecy and discussing its implications."
    },
    {
        id: 5,
        name: "Phase 5: The Truth Revealed",
        description: "Understanding the prophecy and the danger",
        objectives: ["Examine artifact case", "Realize prophecy meaning", "Understand betrayal", "Make decision"],
        transitionKeywords: [
            "we need to train",
            "we should prepare",
            "let's begin our training",
            "we must grow stronger",
            "time to hone our skills"
        ],
        stageDirections: "{{char}} examines the artifact case more closely and finds an inscription that chills them to the bone. It's written in an ancient script that {{char}} can barely decipher: 'One blade remains. One blade was taken. The bearer of the stolen blade seeks the mate. United, they will end all courts. Separated, they are merely legendary weapons.' {{char}} realizes with horror that someone has already taken one of the daggers - and they're likely the rival who's been pursuing them. That rival now knows {{char}} has come for the second dagger. If {{char}} and {{user}} take this dagger, they will be hunted relentlessly. If they leave it, the rival may eventually find it anyway. {{char}} must decide: take the dagger and face the danger, or leave it and hope it remains hidden. Once decided, this phase ends ONLY when {{char}} explicitly suggests they need to prepare for what's coming, using phrases like: 'We need to train for what's ahead' or 'Let's begin preparing ourselves'. Do NOT suggest training until the decision about the dagger is made and its implications discussed."
    },
    {
        id: 6,
        name: "Phase 6: Training and Growth",
        description: "Developing skills and partnership",
        objectives: ["Establish training routine", "Develop new abilities", "Strengthen partnership", "Prepare for threats"],
        transitionKeywords: [], // No transition - this is the final ongoing phase
        stageDirections: "{{char}} and {{user}} are in an ongoing period of training, preparation, and development. They are building their skills, researching the prophecy, strengthening their partnership, and preparing for the inevitable confrontation with whoever holds the other dagger. This is an ongoing phase where their partnership and skills continue to develop. This is the final phase - there is no transition. Focus on specific moments: a particular training session, a research breakthrough, a quiet moment of connection, or preparing defenses. Each interaction should feel like a meaningful scene in their ongoing journey together."
    }
];

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
    private characterName: string;
    private userName: string;
    private cachedStageDirections: Map<number, string> = new Map();
    private currentMessageState: MessageStateType;
    private currentChatState: ChatStateType;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        try {
            const {characters, users, messageState, chatState} = data;
            const charKeys = characters ? Object.keys(characters) : [];
            const userKeys = users ? Object.keys(users) : [];
            this.characterName = charKeys.length > 0 ? characters[charKeys[0]].name : "Character";
            this.userName = userKeys.length > 0 ? users[userKeys[0]].name : "User";

            const defaultState = this.getDefaultMessageState();
            if (messageState) {
                this.currentMessageState = {
                    ...defaultState,
                    ...messageState,
                    messagesInCurrentPhase: messageState.messagesInCurrentPhase ?? 0
                };
            } else {
                this.currentMessageState = defaultState;
            }

            this.currentChatState = chatState || {furthestPhase: 1};
        } catch (error) {
            this.characterName = "Character";
            this.userName = "User";
            this.currentMessageState = this.getDefaultMessageState();
            this.currentChatState = {furthestPhase: 1};
        }
    }

    private getDefaultMessageState(): MessageStateType {
        return {currentPhase: 1, discoveries: [], journalEntries: [], messagesInCurrentPhase: 0};
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        return {success: true};
    }

    async setState(state: MessageStateType): Promise<void> {
        if (state) {
            this.currentMessageState = {
                ...state,
                messagesInCurrentPhase: state.messagesInCurrentPhase ?? 0
            };
        }
    }

    private extractDiscoveries(content: string, phase: number): Discovery[] {
        const discoveries: Discovery[] = [];
        const lower = content.toLowerCase();

        if (lower.includes('found') || lower.includes('discovered') || lower.includes('took')) {
            const match = /(?:found|discovered|took|grabbed|obtained)\s+(?:a|an|the)\s+([a-zA-Z\s]{5,35})/i.exec(content);
            if (match) discoveries.push({type: 'item', content: match[1].trim(), phase});
        }

        if (lower.includes('encountered') || lower.includes('fought') || lower.includes('faced')) {
            const match = /(?:encountered|fought|faced|saw)\s+(?:a|an|the)\s+([a-zA-Z\s]{5,35})/i.exec(content);
            if (match) discoveries.push({type: 'creature', content: match[1].trim(), phase});
        }

        if (lower.includes('entered') || lower.includes('reached')) {
            const match = /(?:entered|reached|arrived at)\s+(?:a|an|the)\s+([a-zA-Z\s]{5,35})/i.exec(content);
            if (match) discoveries.push({type: 'location', content: match[1].trim(), phase});
        }

        return discoveries;
    }

    /**
     * ⚡ IMPROVED PHASE TRANSITION LOGIC ⚡
     *
     * Changes from original:
     * 1. Increased minimum messages from 3 to 6 for better phase development
     * 2. Uses EXPLICIT transition keywords that the bot must intentionally say
     * 3. Implements a maximum message cap as a safety valve
     * 4. More natural progression - bot must deliberately signal readiness
     *
     * IMPORTANT: Only USER messages count toward message thresholds.
     * Bot/character responses do NOT increment the counter.
     *
     * Flow:
     * 1. Phase starts → messagesInCurrentPhase = 0
     * 2. User messages 1-5 → Keywords are NOT evaluated (returns false immediately)
     * 3. User messages 6-19 → EXPLICIT transition keywords ARE evaluated
     * 4. User message 20+ → Safety valve activates, allowing transition with looser criteria
     * 5. Phase transition occurs → messagesInCurrentPhase resets to 0
     */
    private checkPhaseTransition(content: string, currentPhase: number, messagesInPhase: number): boolean {
        // Early exit: already at final phase, no transitions possible
        if (currentPhase >= PHASES.length) return false;

        const currentPhaseConfig = PHASES[currentPhase - 1];

        // Safety check
        if (!currentPhaseConfig) return false;

        // Final phase has no transition keywords - it's ongoing
        if (currentPhaseConfig.transitionKeywords.length === 0) return false;

        // ⚠️ CRITICAL: Enforce minimum message waiting period
        // This gives the phase time to breathe and develop naturally
        if (messagesInPhase < MIN_MESSAGES_BEFORE_EVALUATION) {
            return false; // Too early - still in development phase
        }

        const lower = content.toLowerCase();

        // NORMAL OPERATION (6-19 messages): Look for EXPLICIT transition keywords only
        // These are deliberate phrases the bot must say to signal readiness to move on
        if (messagesInPhase < MAX_MESSAGES_BEFORE_FORCED_CHECK) {
            return currentPhaseConfig.transitionKeywords.some(keyword =>
                lower.includes(keyword.toLowerCase())
            );
        }

        // SAFETY VALVE (20+ messages): Phase has gone on very long
        // Allow transition if any transition keyword appears
        // This prevents phases from getting stuck indefinitely
        return currentPhaseConfig.transitionKeywords.some(keyword =>
            lower.includes(keyword.toLowerCase())
        );
    }

    private generateJournalEntry(phase: number, discoveries: Discovery[]): string {
        const phaseConfig = PHASES[phase - 1];
        const phaseDiscoveries = discoveries.filter(d => d.phase === phase);

        if (phaseDiscoveries.length === 0) {
            return `${phaseConfig.name}: ${phaseConfig.description}`;
        }

        const items = phaseDiscoveries.filter(d => d.type === 'item').map(d => d.content);
        const creatures = phaseDiscoveries.filter(d => d.type === 'creature').map(d => d.content);
        const locations = phaseDiscoveries.filter(d => d.type === 'location').map(d => d.content);

        const parts: string[] = [];
        if (locations.length > 0) parts.push(`explored ${locations[0]}`);
        if (creatures.length > 0) parts.push(`encountered ${creatures[0]}`);
        if (items.length > 0) parts.push(`found ${items[0]}`);

        return `${phaseConfig.name}: ${parts.join(', ') || phaseConfig.description}`;
    }

    /**
     * ⚡ DYNAMIC PACING GUIDANCE ⚡
     *
     * This function adds real-time pacing instructions to stage directions
     * based on how many messages have occurred in the current phase.
     * This helps guide the bot's behavior throughout the phase lifecycle.
     */
    private getStageDirections(phase: number): string {
        if (this.cachedStageDirections.has(phase)) {
            // Clear cache if we've re-entered this phase (shouldn't happen often)
            this.cachedStageDirections.delete(phase);
        }

        const phaseConfig = PHASES[phase - 1];
        if (!phaseConfig) return "";

        let directions = phaseConfig.stageDirections
            .replace(/\{\{char\}\}/g, this.characterName)
            .replace(/\{\{user\}\}/g, this.userName);

        const msgCount = this.currentMessageState.messagesInCurrentPhase;

        // Add dynamic pacing guidance based on current message count
        if (msgCount < 3) {
            directions += "\n\n🎯 PACING STAGE - Early Phase: This phase just started. Focus on just ONE topic or detail at a time. Take your time setting the scene. Do NOT rush or cover multiple topics in a single response. Build the atmosphere slowly.";
        } else if (msgCount < 6) {
            directions += "\n\n🎯 PACING STAGE - Building Phase: Still early in this phase. Continue developing the scene naturally. Focus on one or two elements per response. Do NOT jump ahead to conclusions or try to wrap things up. There's still plenty of time to explore.";
        } else if (msgCount < 10) {
            directions += "\n\n🎯 PACING STAGE - Mid Phase: You're in the middle of this phase. The scene is developing well. Continue exploring and interacting naturally. You MAY begin thinking about the phase's eventual conclusion, but don't rush toward it yet. Let things unfold organically.";
        } else if (msgCount < 15) {
            directions += "\n\n🎯 PACING STAGE - Maturing Phase: This phase has been developing nicely. If it feels natural and appropriate based on the story so far, you may begin guiding toward the phase's conclusion using the specified transition phrases. But ONLY if it feels right - don't force it.";
        } else if (msgCount < MAX_MESSAGES_BEFORE_FORCED_CHECK) {
            directions += "\n\n🎯 PACING STAGE - Ready to Transition: This phase has developed well over many messages. When you feel the time is right, use one of the specified transition phrases to move the story forward to the next phase.";
        } else {
            directions += "\n\n🎯 PACING STAGE - Extended Phase: This phase has gone on for quite a while. Please wrap up this scene and use one of the transition phrases to move the story forward.";
        }

        const result = `[Stage Direction: ${directions}]`;
        this.cachedStageDirections.set(phase, result);
        return result;
    }

    private processMessage(content: string, isUserMessage: boolean): Partial<StageResponse<ChatStateType, MessageStateType>> {
        try {
            const currentState = this.currentMessageState || this.getDefaultMessageState();
            const currentPhase = currentState.currentPhase;

            // Increment message counter ONLY for user messages (not bot messages)
            const messagesInPhase = isUserMessage
                ? currentState.messagesInCurrentPhase + 1
                : currentState.messagesInCurrentPhase;

            const newDiscoveries = currentState.discoveries.length < 50
                ? this.extractDiscoveries(content, currentPhase)
                : [];

            const allDiscoveries = [...currentState.discoveries, ...newDiscoveries];

            let nextPhase = currentPhase;
            let newJournalEntries = currentState.journalEntries;
            let newMessageCount = messagesInPhase;

            // Check for phase transition
            // Note: checkPhaseTransition will return false if messagesInPhase < MIN_MESSAGES_BEFORE_EVALUATION
            if (this.checkPhaseTransition(content, currentPhase, messagesInPhase)) {
                const journalEntry = this.generateJournalEntry(currentPhase, allDiscoveries);
                newJournalEntries = [...newJournalEntries, {
                    phase: currentPhase,
                    content: journalEntry
                }];
                nextPhase = currentPhase + 1;
                // Reset counter to 0 when entering new phase
                newMessageCount = 0;
            }

            const newMessageState: MessageStateType = {
                currentPhase: nextPhase,
                discoveries: allDiscoveries,
                journalEntries: newJournalEntries,
                messagesInCurrentPhase: newMessageCount
            };

            const newChatState: ChatStateType = {
                furthestPhase: Math.max(this.currentChatState.furthestPhase, nextPhase)
            };

            this.currentMessageState = newMessageState;
            this.currentChatState = newChatState;

            return {
                stageDirections: isUserMessage ? this.getStageDirections(nextPhase) : null,
                messageState: newMessageState,
                chatState: newChatState,
                modifiedMessage: null,
                systemMessage: null,
                error: null
            };
        } catch (error) {
            return {
                stageDirections: null,
                messageState: this.currentMessageState,
                chatState: this.currentChatState,
                modifiedMessage: null,
                systemMessage: null,
                error: null
            };
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return this.processMessage(userMessage.content, true);
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return this.processMessage(botMessage.content, false);
    }

    render(): ReactElement {
        try {
            const currentState = this.currentMessageState || this.getDefaultMessageState();
            const currentPhase = PHASES[currentState.currentPhase - 1] || PHASES[0];
            const chatState = this.currentChatState || {furthestPhase: 1};
            const recentDiscoveries = (currentState.discoveries || []).slice(-10).reverse();
            const msgCount = currentState.messagesInCurrentPhase ?? 0;

            // Determine pacing status for visual feedback
            let pacingStatus: 'early' | 'building' | 'mid' | 'ready' | 'extended';
            let pacingColor: string;
            let pacingLabel: string;

            if (msgCount < 3) {
                pacingStatus = 'early';
                pacingColor = '#3498db';
                pacingLabel = 'EARLY PHASE - Building the scene';
            } else if (msgCount < 6) {
                pacingStatus = 'building';
                pacingColor = '#9b59b6';
                pacingLabel = 'DEVELOPING - Scene unfolding';
            } else if (msgCount < 10) {
                pacingStatus = 'mid';
                pacingColor = '#f39c12';
                pacingLabel = 'MID-PHASE - Story progressing';
            } else if (msgCount < MAX_MESSAGES_BEFORE_FORCED_CHECK) {
                pacingStatus = 'ready';
                pacingColor = '#2ecc71';
                pacingLabel = 'READY - May transition when appropriate';
            } else {
                pacingStatus = 'extended';
                pacingColor = '#e74c3c';
                pacingLabel = 'EXTENDED - Should wrap up soon';
            }

            return (
                <div style={{width: '100vw', height: '100vh', padding: '20px', backgroundColor: '#1a1a2e', color: '#eaeaea', fontFamily: 'Georgia, serif', overflowY: 'auto', boxSizing: 'border-box'}}>
                    <div style={{borderBottom: '2px solid #c9a961', paddingBottom: '15px', marginBottom: '20px'}}>
                        <h1 style={{margin: '0 0 5px 0', fontSize: '28px', color: '#c9a961', textAlign: 'center'}}>The Prophecy Quest</h1>
                        <p style={{margin: 0, fontSize: '14px', color: '#aaa', textAlign: 'center'}}>{this.characterName} & {this.userName}</p>
                    </div>

                    <div style={{backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #c9a961'}}>
                        <h2 style={{margin: '0 0 10px 0', fontSize: '20px', color: '#c9a961'}}>{currentPhase.name}</h2>
                        <p style={{margin: 0, fontSize: '14px', color: '#ccc', fontStyle: 'italic'}}>{currentPhase.description}</p>
                        <div style={{marginTop: '10px', fontSize: '12px', color: '#888'}}>
                            Phase {currentState.currentPhase} of {PHASES.length}
                            {chatState.furthestPhase > currentState.currentPhase && ` (Furthest: Phase ${chatState.furthestPhase})`}
                        </div>
                    </div>

                    {/* IMPROVED PACING INDICATOR */}
                    <div style={{
                        backgroundColor: '#0f3460',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid #16537e'
                    }}>
                        <h3 style={{margin: '0 0 10px 0', fontSize: '16px', color: '#5dade2', fontFamily: 'monospace'}}>
                            ⏱️ Phase Pacing Status
                        </h3>

                        <div style={{
                            padding: '12px',
                            backgroundColor: msgCount < MIN_MESSAGES_BEFORE_EVALUATION ? '#3d2a0a' : '#0a2540',
                            borderRadius: '4px',
                            border: `2px solid ${pacingColor}`
                        }}>
                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                                <strong>📊 User Messages in Phase:</strong>
                                <span style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: pacingColor
                                }}>
                                    {msgCount}
                                </span>
                            </div>

                            {/* Progress bar showing position in phase lifecycle */}
                            <div style={{
                                width: '100%',
                                height: '10px',
                                backgroundColor: '#1a1a2e',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                marginBottom: '10px',
                                position: 'relative'
                            }}>
                                {/* Minimum threshold marker */}
                                <div style={{
                                    position: 'absolute',
                                    left: `${(MIN_MESSAGES_BEFORE_EVALUATION / MAX_MESSAGES_BEFORE_FORCED_CHECK) * 100}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: '2px',
                                    backgroundColor: '#2ecc71',
                                    zIndex: 2
                                }} />

                                {/* Progress fill */}
                                <div style={{
                                    width: `${Math.min((msgCount / MAX_MESSAGES_BEFORE_FORCED_CHECK) * 100, 100)}%`,
                                    height: '100%',
                                    backgroundColor: pacingColor,
                                    transition: 'width 0.3s ease, background-color 0.3s ease'
                                }} />
                            </div>

                            <div style={{color: pacingColor, fontSize: '12px', fontWeight: 'bold', marginBottom: '8px'}}>
                                <span style={{fontSize: '14px', marginRight: '4px'}}>
                                    {msgCount < MIN_MESSAGES_BEFORE_EVALUATION ? '⏳' :
                                     msgCount < COMFORTABLE_PHASE_LENGTH ? '🎭' :
                                     msgCount < MAX_MESSAGES_BEFORE_FORCED_CHECK ? '✓' : '⚠️'}
                                </span>
                                {pacingLabel}
                            </div>

                            {msgCount < MIN_MESSAGES_BEFORE_EVALUATION ? (
                                <div style={{color: '#f39c12', fontSize: '11px'}}>
                                    <strong>MINIMUM PHASE DEVELOPMENT:</strong> {MIN_MESSAGES_BEFORE_EVALUATION - msgCount} more user message{MIN_MESSAGES_BEFORE_EVALUATION - msgCount === 1 ? '' : 's'} until transition keywords can be evaluated.
                                    <div style={{marginTop: '4px', fontStyle: 'italic', opacity: 0.8}}>
                                        The bot should focus on developing this phase naturally, not rushing to the conclusion.
                                    </div>
                                </div>
                            ) : msgCount < COMFORTABLE_PHASE_LENGTH ? (
                                <div style={{color: '#9b59b6', fontSize: '11px'}}>
                                    <strong>ACTIVE DEVELOPMENT:</strong> Phase can now progress when the bot uses a transition phrase, but there's still plenty of room for the scene to develop.
                                    <div style={{marginTop: '4px', fontStyle: 'italic', opacity: 0.8}}>
                                        Comfortable phase length: ~{COMFORTABLE_PHASE_LENGTH} messages
                                    </div>
                                </div>
                            ) : msgCount < MAX_MESSAGES_BEFORE_FORCED_CHECK ? (
                                <div style={{color: '#2ecc71', fontSize: '11px'}}>
                                    <strong>READY TO TRANSITION:</strong> Phase has developed well. Bot may use a transition phrase when narratively appropriate.
                                    <div style={{marginTop: '4px', fontStyle: 'italic', opacity: 0.8}}>
                                        Safety valve activates at {MAX_MESSAGES_BEFORE_FORCED_CHECK} messages
                                    </div>
                                </div>
                            ) : (
                                <div style={{color: '#e74c3c', fontSize: '11px'}}>
                                    <strong>EXTENDED PHASE:</strong> This phase has gone on longer than expected. Bot should wrap up and transition.
                                    <div style={{marginTop: '4px', fontStyle: 'italic', opacity: 0.8}}>
                                        Safety valve is active - allowing looser transition criteria
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentPhase.transitionKeywords.length > 0 && (
                            <div style={{marginTop: '12px', fontSize: '11px', color: '#85c1e9', fontFamily: 'monospace', padding: '10px', backgroundColor: '#0a2540', borderRadius: '4px'}}>
                                <strong>⚡ Required Transition Phrases:</strong>
                                <div style={{marginTop: '6px', paddingLeft: '10px'}}>
                                    {currentPhase.transitionKeywords.map((keyword, idx) => (
                                        <div key={idx} style={{marginTop: '4px'}}>
                                            • "{keyword}"
                                        </div>
                                    ))}
                                </div>
                                <div style={{marginTop: '8px', fontStyle: 'italic', opacity: 0.7}}>
                                    Bot must use one of these exact phrases to transition to the next phase
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #555'}}>
                        <h3 style={{margin: '0 0 15px 0', fontSize: '18px', color: '#c9a961', borderBottom: '1px solid #555', paddingBottom: '8px'}}>📖 Journey Journal</h3>
                        {currentState.journalEntries.length === 0 ? (
                            <p style={{margin: 0, color: '#888', fontStyle: 'italic'}}>Your journey begins...</p>
                        ) : (
                            <div style={{fontSize: '14px'}}>
                                {currentState.journalEntries.map((entry, idx) => (
                                    <div key={idx} style={{marginBottom: '10px', paddingBottom: '10px', borderBottom: idx < currentState.journalEntries.length - 1 ? '1px solid #333' : 'none'}}>
                                        <div style={{color: '#c9a961', marginBottom: '3px'}}>Phase {entry.phase}</div>
                                        <div style={{color: '#ccc'}}>{entry.content}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {recentDiscoveries.length > 0 && (
                        <div style={{backgroundColor: '#0f3460', padding: '15px', borderRadius: '8px', border: '1px solid #16537e'}}>
                            <h3 style={{margin: '0 0 10px 0', fontSize: '16px', color: '#5dade2', fontFamily: 'monospace'}}>🔍 Recent Discoveries</h3>
                            <div style={{fontSize: '12px', color: '#aed6f1', fontFamily: 'monospace'}}>
                                {recentDiscoveries.map((discovery: Discovery, idx: number) => (
                                    <div key={idx} style={{marginBottom: '8px', padding: '5px', backgroundColor: '#1a4971', borderRadius: '4px'}}>
                                        <span style={{color: '#f39c12', fontWeight: 'bold', marginRight: '8px'}}>[{discovery.type.toUpperCase()}]</span>
                                        <span style={{color: '#ecf0f1'}}>{discovery.content}</span>
                                        <span style={{color: '#7f8c8d', fontSize: '10px', marginLeft: '8px'}}>(P{discovery.phase})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        } catch (error) {
            return (
                <div style={{width: '100vw', height: '100vh', padding: '20px', backgroundColor: '#1a1a2e', color: '#eaeaea', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div style={{textAlign: 'center'}}>
                        <h1 style={{color: '#c9a961'}}>The Prophecy Quest</h1>
                        <p>Initializing your adventure...</p>
                    </div>
                </div>
            );
        }
    }
}
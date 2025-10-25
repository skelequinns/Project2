import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

/***
 * Discovery tracking types
 */
interface Discovery {
    type: 'item' | 'creature' | 'revelation' | 'location';
    content: string;
    phase: number;
}

/***
 * Phase configuration
 */
interface PhaseConfig {
    id: number;
    name: string;
    description: string;
    objectives: string[];
    keywords: string[];
    stageDirections: string;
}

/***
 * Journal entry for story tracking
 */
interface JournalEntry {
    phase: number;
    content: string;
}

type MessageStateType = {
    currentPhase: number;
    discoveries: Discovery[];
    journalEntries: JournalEntry[];
};

type ConfigType = {
    debugMode?: boolean;
};

type InitStateType = {
    startTimestamp: number;
};

type ChatStateType = {
    furthestPhase: number;
};

/***
 * Phase definitions for the story
 */
const PHASES: PhaseConfig[] = [
    {
        id: 1,
        name: "Phase 1: Planning",
        description: "Meeting at the inn to discuss the mission",
        objectives: [
            "Meet at the inn",
            "Discuss the mission",
            "Plan the route",
            "Rest for the night"
        ],
        keywords: ["first light", "dawn", "morning", "good night", "rest for"],
        stageDirections: "{{char}} is meeting {{user}} at an inn on the edge of {{char}}'s territory. They need to discuss a mission to retrieve a powerful magical artifact from an ancient temple in a neighboring court. {{char}} should guide the conversation toward planning their travel route (air, forest, or road) and discussing potential complications from rivals who may also be seeking the artifact. The phase should end with {{char}} suggesting they rest for the night and leave at first light. {{char}} does not yet know what they will find at the temple."
    },
    {
        id: 2,
        name: "Phase 2: Travel to Temple",
        description: "Journey from the inn to the temple",
        objectives: [
            "Leave at dawn",
            "Choose travel route",
            "Overcome obstacles",
            "Arrive at temple"
        ],
        keywords: ["temple", "arrived", "reach", "entrance", "gates"],
        stageDirections: "{{char}} and {{user}} are traveling to the ancient temple to retrieve the artifact. They left at dawn and must navigate challenges based on their chosen route: if traveling by air, they risk being spotted and attacked from below; through the forest, they must watch for dangerous beasts and monsters; by road, the journey takes longer and they risk being intercepted by rivals. {{char}} should introduce obstacles and friction that must be overcome during the journey. Guide the story toward their arrival at the temple. {{char}} still does not know what awaits them inside."
    },
    {
        id: 3,
        name: "Phase 3: Exploring the Temple",
        description: "Searching the temple's main floor",
        objectives: [
            "Enter temple",
            "Explore atrium",
            "Investigate chambers",
            "Find hidden staircase"
        ],
        keywords: ["hidden", "staircase", "stairs", "descend", "below", "beneath", "underground"],
        stageDirections: "{{char}} and {{user}} are exploring a large, ancient temple. The architecture is labyrinthine with mysterious murals painted on the walls. A central atrium leads to approximately a dozen chambers on the main floor. As they search, they find that none of these chambers contain the artifact they seek, though they may discover other interesting magical items or encounter creatures that inhabit the temple. {{char}} should describe the temple's eerie atmosphere and guide the exploration. The artifact must be somewhere else - perhaps deeper within the temple. The phase advances when they discover a hidden staircase leading down beneath the main atrium."
    },
    {
        id: 4,
        name: "Phase 4: The Hidden Chamber",
        description: "Descending into the depths of the temple",
        objectives: [
            "Descend staircase",
            "Enter cavern",
            "Study prophecy",
            "Approach artifact"
        ],
        keywords: ["artifact", "daggers", "pedestal", "approach"],
        stageDirections: "{{char}} and {{user}} are descending a long, dark, damp spiral staircase. Water drips constantly from the walls. The descent seems endless. When they finally reach the bottom, they enter a massive underground cavern unlike anything above. The chamber is filled with stained glass windows that seem to glow with their own light, elaborate murals, and ancient statues. As {{char}} studies these images, they begin to realize these depictions tell a story - a prophecy. The images show two figures (who bear a striking resemblance to {{char}} and {{user}}) finding an artifact, falling in love, and standing together against a terrible threat. {{char}} should express shock, confusion, or disbelief at seeing this prophecy about themselves. The phase advances when they approach what appears to be the artifact on a pedestal in the center of the chamber."
    },
    {
        id: 5,
        name: "Phase 5: The Artifact",
        description: "Discovering the twin daggers",
        objectives: [
            "Examine daggers",
            "Sense their power",
            "Take the daggers"
        ],
        keywords: ["take", "took", "grab", "claim", "both"],
        stageDirections: "{{char}} and {{user}} approach the pedestal at the center of the chamber. What they find is unexpected - the artifact is not a single object, but a pair of daggers resting on the ancient stone. One blade appears to be forged from pure starlight itself, glowing softly and seeming to whisper directly to {{user}}. The other is carved from obsidian so dark it seems to absorb light, and it pulses with a presence that calls specifically to {{char}}. Both weapons have an otherworldly, almost alive quality that makes {{char}} hesitate. These are clearly objects of immense power - perhaps even dangerous power. {{char}} should express hesitation, awe, fear, or wonder at what they've found. The prophecy suggested they would find this together. Guide toward both {{char}} and {{user}} claiming their respective daggers."
    },
    {
        id: 6,
        name: "Phase 6: The Escape",
        description: "Fleeing the collapsing temple",
        objectives: [
            "Escape collapsing temple",
            "Avoid hazards",
            "Return to Velaris"
        ],
        keywords: ["velaris", "returned", "safe", "escaped", "made it"],
        stageDirections: "The moment the daggers are removed from their resting place, the entire temple begins to collapse! Ancient mechanisms have been triggered. {{char}} and {{user}} must flee immediately through crumbling passages and collapsing chambers. Stone falls from above, water floods through cracks in the walls, and the very ground shakes beneath their feet. They may encounter creatures and monsters that also inhabit the temple, now desperately trying to escape the destruction. {{char}} should create a sense of urgency and danger as they describe the environmental hazards. Guide the story toward {{char}} and {{user}} successfully escaping the temple and making their way back to Velaris ({{char}}'s home territory)."
    },
    {
        id: 7,
        name: "Phase 7: Accepting Their Fates",
        description: "Facing the prophecy's implications",
        objectives: [
            "Discuss prophecy",
            "Acknowledge threats",
            "Decide to train together"
        ],
        keywords: ["learn", "train", "master", "together", "practice"],
        stageDirections: "{{char}} and {{user}} have returned safely to Velaris with the twin daggers. Now they must face what the prophecy in the temple revealed and what it means for their future. The daggers are incredibly powerful and dangerous - they can feel the raw magic thrumming through the weapons. Other court rulers will inevitably learn about the daggers and come seeking them, either to take them or to eliminate the threat. The weapons are both a blessing and a burden - symbols of power but also targets painted on their backs. {{char}} should discuss the weight of this responsibility, their feelings about the prophecy (especially the part about falling in love), the threats they now face, and what they should do next. Guide the conversation toward {{char}} and {{user}} deciding to learn how to properly wield and control the daggers together rather than hiding them away or trying to destroy them."
    },
    {
        id: 8,
        name: "Phase 8: Moving Forward Together",
        description: "Preparing for the coming storm",
        objectives: [
            "Research daggers",
            "Train together",
            "Prepare for Hybern"
        ],
        keywords: [],
        stageDirections: "{{char}} and {{user}} have committed to learning how to wield the ancient daggers together. They are now researching the weapons' origins and the legends surrounding them, searching for any information that might help them understand and control the immense power contained within. They train together, attempting to master the daggers while also preparing for the inevitable threats that will come. Somewhere across the sea, their greatest enemy - Hybern - will eventually learn of what they've found, and that danger looms on the horizon. {{char}} should describe their training sessions, any discoveries they make about the daggers' history or abilities, and the growing bond between them as they face this challenge together. This is an ongoing phase where their partnership and skills continue to develop."
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

        const {characters, users, messageState, chatState} = data;

        // Extract names
        const charKeys = Object.keys(characters);
        const userKeys = Object.keys(users);
        this.characterName = charKeys.length > 0 ? characters[charKeys[0]].name : "Character";
        this.userName = userKeys.length > 0 ? users[userKeys[0]].name : "User";

        // Initialize internal state tracking
        this.currentMessageState = messageState || this.getDefaultMessageState();
        this.currentChatState = chatState || {furthestPhase: 1};
    }

    private getDefaultMessageState(): MessageStateType {
        return {
            currentPhase: 1,
            discoveries: [],
            journalEntries: []
        };
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        return {
            success: true,
            error: null,
            initState: {startTimestamp: Date.now()},
            chatState: {furthestPhase: 1},
            messageState: this.getDefaultMessageState()
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        if (state) {
            this.currentMessageState = state;
        }
    }

    /**
     * Simplified discovery extraction - only first match per type
     */
    private extractDiscoveries(content: string, phase: number): Discovery[] {
        const discoveries: Discovery[] = [];
        const lower = content.toLowerCase();

        // Item detection
        if (lower.includes('found') || lower.includes('discovered') || lower.includes('took')) {
            const match = /(?:found|discovered|took|grabbed|obtained)\s+(?:a|an|the)\s+([a-zA-Z\s]{5,35})/i.exec(content);
            if (match) discoveries.push({type: 'item', content: match[1].trim(), phase});
        }

        // Creature detection
        if (lower.includes('encountered') || lower.includes('fought') || lower.includes('faced')) {
            const match = /(?:encountered|fought|faced|saw)\s+(?:a|an|the)\s+([a-zA-Z\s]{5,35})/i.exec(content);
            if (match) discoveries.push({type: 'creature', content: match[1].trim(), phase});
        }

        // Location detection
        if (lower.includes('entered') || lower.includes('reached')) {
            const match = /(?:entered|reached|arrived at)\s+(?:a|an|the)\s+([a-zA-Z\s]{5,35})/i.exec(content);
            if (match) discoveries.push({type: 'location', content: match[1].trim(), phase});
        }

        return discoveries;
    }

    /**
     * Quick keyword check
     */
    private checkPhaseTransition(content: string, currentPhase: number): boolean {
        const phase = PHASES[currentPhase - 1];
        if (!phase || phase.keywords.length === 0) return false;

        const lower = content.toLowerCase();
        return phase.keywords.some(keyword => lower.includes(keyword));
    }

    /**
     * Simple journal generation
     */
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
     * Cached stage directions
     */
    private getStageDirections(phase: number): string {
        if (this.cachedStageDirections.has(phase)) {
            return this.cachedStageDirections.get(phase)!;
        }

        const phaseConfig = PHASES[phase - 1];
        if (!phaseConfig) return "";

        let directions = phaseConfig.stageDirections
            .replace(/\{\{char\}\}/g, this.characterName)
            .replace(/\{\{user\}\}/g, this.userName);

        const result = `[Stage Direction: ${directions}]`;
        this.cachedStageDirections.set(phase, result);
        return result;
    }

    /**
     * Process message and update state
     */
    private processMessage(content: string, isUserMessage: boolean): Partial<StageResponse<ChatStateType, MessageStateType>> {
        const currentState = this.currentMessageState;
        const currentPhase = currentState.currentPhase;

        // Extract discoveries (limit to avoid bloat)
        const newDiscoveries = currentState.discoveries.length < 50
            ? this.extractDiscoveries(content, currentPhase)
            : [];

        const allDiscoveries = [...currentState.discoveries, ...newDiscoveries];

        // Check phase transition
        let nextPhase = currentPhase;
        let newJournalEntries = currentState.journalEntries;

        if (this.checkPhaseTransition(content, currentPhase) && currentPhase < PHASES.length) {
            const journalEntry = this.generateJournalEntry(currentPhase, allDiscoveries);
            newJournalEntries = [...newJournalEntries, {
                phase: currentPhase,
                content: journalEntry
            }];
            nextPhase = currentPhase + 1;
        }

        const newMessageState: MessageStateType = {
            currentPhase: nextPhase,
            discoveries: allDiscoveries,
            journalEntries: newJournalEntries
        };

        const newChatState: ChatStateType = {
            furthestPhase: Math.max(this.currentChatState.furthestPhase, nextPhase)
        };

        // Update internal state
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
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return this.processMessage(userMessage.content, true);
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return this.processMessage(botMessage.content, false);
    }

    render(): ReactElement {
        const currentState = this.currentMessageState;
        const currentPhase = PHASES[currentState.currentPhase - 1];
        const chatState = this.currentChatState;
        const recentDiscoveries = currentState.discoveries.slice(-10).reverse();

        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                padding: '20px',
                backgroundColor: '#1a1a2e',
                color: '#eaeaea',
                fontFamily: 'Georgia, serif',
                overflowY: 'auto',
                boxSizing: 'border-box'
            }}>
                {/* Header */}
                <div style={{
                    borderBottom: '2px solid #c9a961',
                    paddingBottom: '15px',
                    marginBottom: '20px'
                }}>
                    <h1 style={{
                        margin: '0 0 5px 0',
                        fontSize: '28px',
                        color: '#c9a961',
                        textAlign: 'center'
                    }}>
                        The Prophecy Quest
                    </h1>
                    <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#aaa',
                        textAlign: 'center'
                    }}>
                        {this.characterName} & {this.userName}
                    </p>
                </div>

                {/* Current Phase */}
                <div style={{
                    backgroundColor: '#16213e',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #c9a961'
                }}>
                    <h2 style={{
                        margin: '0 0 10px 0',
                        fontSize: '20px',
                        color: '#c9a961'
                    }}>
                        {currentPhase.name}
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#ccc',
                        fontStyle: 'italic'
                    }}>
                        {currentPhase.description}
                    </p>
                    <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#888'
                    }}>
                        Phase {currentState.currentPhase} of {PHASES.length}
                        {chatState.furthestPhase > currentState.currentPhase &&
                            ` (Furthest: Phase ${chatState.furthestPhase})`
                        }
                    </div>
                </div>

                {/* Journal */}
                <div style={{
                    backgroundColor: '#16213e',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #555'
                }}>
                    <h3 style={{
                        margin: '0 0 15px 0',
                        fontSize: '18px',
                        color: '#c9a961',
                        borderBottom: '1px solid #555',
                        paddingBottom: '8px'
                    }}>
                        📖 Journey Journal
                    </h3>
                    {currentState.journalEntries.length === 0 ? (
                        <p style={{
                            margin: 0,
                            fontSize: '14px',
                            color: '#888',
                            fontStyle: 'italic'
                        }}>
                            Your story begins...
                        </p>
                    ) : (
                        <div style={{fontSize: '14px', lineHeight: '1.8'}}>
                            {currentState.journalEntries.map((entry: JournalEntry, idx: number) => (
                                <div key={idx} style={{marginBottom: '10px', color: '#ccc'}}>
                                    {entry.content}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Debug: Objectives */}
                <div style={{
                    backgroundColor: '#0f3460',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #16537e'
                }}>
                    <h3 style={{
                        margin: '0 0 10px 0',
                        fontSize: '16px',
                        color: '#5dade2',
                        fontFamily: 'monospace'
                    }}>
                        🔧 DEBUG: Phase Objectives
                    </h3>
                    <div style={{
                        fontSize: '13px',
                        color: '#aed6f1',
                        fontFamily: 'monospace'
                    }}>
                        {PHASES.map((phase: PhaseConfig, phaseIdx: number) => {
                            const isCurrentPhase = phase.id === currentState.currentPhase;
                            const isCompletedPhase = phase.id < currentState.currentPhase;
                            const isFuturePhase = phase.id > currentState.currentPhase;

                            // Don't show future phases
                            if (isFuturePhase) return null;

                            return (
                                <div key={phaseIdx} style={{
                                    marginBottom: '15px',
                                    padding: '10px',
                                    backgroundColor: isCurrentPhase ? '#1a4971' : '#0a2540',
                                    borderRadius: '6px',
                                    border: isCurrentPhase ? '2px solid #5dade2' : '1px solid #16537e'
                                }}>
                                    <div style={{
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                        color: isCurrentPhase ? '#5dade2' : '#7f8c8d',
                                        fontSize: '14px'
                                    }}>
                                        {isCurrentPhase && '▶ '}
                                        {phase.name}
                                        {isCompletedPhase && ' ✓'}
                                    </div>
                                    {phase.objectives.map((objective: string, objIdx: number) => (
                                        <div key={objIdx} style={{
                                            marginBottom: '4px',
                                            paddingLeft: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            opacity: isCompletedPhase ? 0.7 : 1
                                        }}>
                                            <span style={{
                                                marginRight: '8px',
                                                fontSize: '16px',
                                                color: isCompletedPhase ? '#2ecc71' : isCurrentPhase ? '#f39c12' : '#7f8c8d'
                                            }}>
                                                {isCompletedPhase ? '✓' : isCurrentPhase ? '○' : ''}
                                            </span>
                                            <span style={{
                                                color: isCompletedPhase ? '#a8dadc' : isCurrentPhase ? '#ecf0f1' : '#7f8c8d',
                                                textDecoration: isCompletedPhase ? 'line-through' : 'none'
                                            }}>
                                                {objective}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                    {currentPhase.keywords.length > 0 && (
                        <div style={{
                            marginTop: '12px',
                            fontSize: '12px',
                            color: '#85c1e9',
                            fontFamily: 'monospace',
                            padding: '8px',
                            backgroundColor: '#0a2540',
                            borderRadius: '4px'
                        }}>
                            <strong>⚡ Transition Keywords:</strong> {currentPhase.keywords.join(', ')}
                        </div>
                    )}
                </div>

                {/* Debug: Discoveries */}
                {recentDiscoveries.length > 0 && (
                    <div style={{
                        backgroundColor: '#0f3460',
                        padding: '15px',
                        borderRadius: '8px',
                        border: '1px solid #16537e'
                    }}>
                        <h3 style={{
                            margin: '0 0 10px 0',
                            fontSize: '16px',
                            color: '#5dade2',
                            fontFamily: 'monospace'
                        }}>
                            🔍 DEBUG: Recent Discoveries
                        </h3>
                        <div style={{
                            fontSize: '12px',
                            color: '#aed6f1',
                            fontFamily: 'monospace'
                        }}>
                            {recentDiscoveries.map((discovery: Discovery, idx: number) => (
                                <div key={idx} style={{
                                    marginBottom: '8px',
                                    padding: '5px',
                                    backgroundColor: '#1a4971',
                                    borderRadius: '4px'
                                }}>
                                    <span style={{
                                        color: '#f39c12',
                                        fontWeight: 'bold',
                                        marginRight: '8px'
                                    }}>
                                        [{discovery.type.toUpperCase()}]
                                    </span>
                                    <span style={{color: '#ecf0f1'}}>
                                        {discovery.content}
                                    </span>
                                    <span style={{
                                        color: '#7f8c8d',
                                        fontSize: '10px',
                                        marginLeft: '8px'
                                    }}>
                                        (P{discovery.phase})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
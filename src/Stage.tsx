import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

type MessageStateType = {currentPhase: number};
type ConfigType = any;
type InitStateType = any;
type ChatStateType = any;

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
    private phase: number = 1;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        this.phase = (data.messageState && data.messageState.currentPhase) || 1;
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        return {success: true};
    }

    async setState(state: MessageStateType): Promise<void> {
        if (state && state.currentPhase) {
            this.phase = state.currentPhase;
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return {
            stageDirections: `[Phase ${this.phase}: Guide the story forward]`,
            messageState: {currentPhase: this.phase}
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return {
            messageState: {currentPhase: this.phase}
        };
    }

    render(): ReactElement {
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                padding: '20px',
                backgroundColor: '#1a1a2e',
                color: '#eaeaea',
                boxSizing: 'border-box'
            }}>
                <h1 style={{color: '#c9a961'}}>The Prophecy Quest</h1>
                <p>Current Phase: {this.phase}</p>
                <p>Stage is working!</p>
            </div>
        );
    }
}
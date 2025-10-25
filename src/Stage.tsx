import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

type MessageStateType = {
    currentPhase: number;
};

type ConfigType = {};
type InitStateType = {};
type ChatStateType = {};

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {
    private currentMessageState: MessageStateType;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        this.currentMessageState = data.messageState || {currentPhase: 1};
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        return {success: true};
    }

    async setState(state: MessageStateType): Promise<void> {
        if (state) this.currentMessageState = state;
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return {
            stageDirections: "[Test stage directions]",
            messageState: this.currentMessageState
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return {
            messageState: this.currentMessageState
        };
    }

    render(): ReactElement {
        return (
            <div style={{padding: '20px', backgroundColor: '#1a1a2e', color: '#fff', minHeight: '100vh'}}>
                <h1>Test Stage</h1>
                <p>Phase: {this.currentMessageState?.currentPhase || 1}</p>
            </div>
        );
    }
}
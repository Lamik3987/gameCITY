import { BuildingType } from '../types';
import { t } from '../i18n';

export type TutorialStep = {
    id: number;
    title: string;
    text: string;
    highlightArea: string; // Used to block UI or highlight specific parts
    actionRequired?: string; // No longer used, but kept for type compatibility
};

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 1,
        get title() { return t('tut_welcome_title'); },
        get text() { return t('tut_welcome_text'); },
        highlightArea: "stats"
    },
    {
        id: 2,
        get title() { return t('tut_build_res_title'); },
        get text() { return t('tut_build_res_text'); },
        highlightArea: "toolbar_residential"
    },
    {
        id: 3,
        get title() { return t('tut_commercial_title'); },
        get text() { return t('tut_commercial_text'); },
        highlightArea: "toolbar_commercial"
    },
    {
        id: 4,
        get title() { return t('b_industrial_name'); },
        get text() { return t('tut_industrial_text'); },
        highlightArea: "toolbar_industrial"
    },
    {
        id: 5,
        get title() { return t('ui_bonus'); },
        get text() { return t('tut_bonus_text'); },
        highlightArea: "missions_and_gift"
    }
];

export class TutorialManager {
    static getStep(stepId: number): TutorialStep | undefined {
        return TUTORIAL_STEPS.find(s => s.id === stepId);
    }
}

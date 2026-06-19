import { BuildingType } from '../types';

export type TutorialStep = {
    id: number;
    title: string;
    text: string;
    targetTool?: BuildingType;
    targetUI?: string;
    actionRequired: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 1,
        title: "Добро пожаловать, Мэр!",
        text: "Вы только что вступили в должность. Первым делом городу нужна инфраструктура. Выберите инструмент «Дорога» и постройте вашу первую улицу.",
        targetTool: BuildingType.Road,
        actionRequired: "Постройте дорогу"
    },
    {
        id: 2,
        title: "Первые жители",
        text: "Отлично! Теперь людям нужно где-то жить. Выберите Жилой дом (Жилье) и постройте его рядом с дорогой. Обратите внимание, что здания стоят денег.",
        targetTool: BuildingType.Residential,
        actionRequired: "Постройте жилой дом"
    },
    {
        id: 3,
        title: "Экономика и Заводы",
        text: "Чтобы город приносил доход, нужна промышленность. Выберите Промышленность и постройте завод. Он приносит налоги, но снижает счастье, если стоит близко к домам.",
        targetTool: BuildingType.Industrial,
        actionRequired: "Постройте завод"
    },
    {
        id: 4,
        title: "Расширение границ",
        text: "По мере роста городу понадобится больше места. Откройте инструмент «Снести/Территория», выберите покупку чанка (Территория) и кликните на серую зону карты.",
        targetTool: BuildingType.BuyLand,
        actionRequired: "Купите новую территорию"
    },
    {
        id: 5,
        title: "Улучшения",
        text: "В левом верхнем углу находится кнопка «Улучшения». Там вы можете тратить очки уровня на развитие города (например, снизить стоимость дорог).",
        targetUI: "upgrades",
        actionRequired: "Нажмите 'Завершить обучение'"
    }
];

export class TutorialManager {
    static getStep(stepId: number): TutorialStep | undefined {
        return TUTORIAL_STEPS.find(s => s.id === stepId);
    }

    static isUIBlocked(currentStepId: number, uiElement: string | BuildingType): boolean {
        if (currentStepId === 0) return false; // Tutorial completed
        const step = this.getStep(currentStepId);
        if (!step) return false;

        if (step.targetTool !== undefined) {
            return uiElement !== step.targetTool;
        }
        if (step.targetUI !== undefined) {
            return uiElement !== step.targetUI;
        }
        return true; 
    }
}

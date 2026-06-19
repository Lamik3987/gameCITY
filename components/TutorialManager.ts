import { BuildingType } from '../types';

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
        title: "Добро пожаловать, Мэр!",
        text: "Ваш новый город ждет! Давайте проведем небольшую экскурсию. Сверху вы видите вашу Казну и Население. Ваша главная цель — строить город и делать жителей счастливыми.",
        highlightArea: "stats"
    },
    {
        id: 2,
        title: "Жилье",
        text: "Здесь находятся жилые дома. Жителям нужно где-то жить! Стройте жилые зоны, чтобы увеличить население вашего города.",
        highlightArea: "toolbar_residential"
    },
    {
        id: 3,
        title: "Коммерция",
        text: "Здесь находятся коммерческие здания: магазины, торговые центры. В них жители тратят деньги, что приносит налоги в вашу казну!",
        highlightArea: "toolbar_commercial"
    },
    {
        id: 4,
        title: "Промышленность",
        text: "Здесь находятся фабрики и заводы. Они производят товары для магазинов и приносят большой доход, но загрязняют воздух рядом с домами!",
        highlightArea: "toolbar_industrial"
    },
    {
        id: 5,
        title: "Миссии и Бонусы",
        text: "Слева вы видите Миссии, за выполнение которых даются награды. А если не хватает денег — жмите на светящийся Подарок! Удачи, Мэр!",
        highlightArea: "missions_and_gift"
    }
];

export class TutorialManager {
    static getStep(stepId: number): TutorialStep | undefined {
        return TUTORIAL_STEPS.find(s => s.id === stepId);
    }
}

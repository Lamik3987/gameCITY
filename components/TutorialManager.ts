import { BuildingType } from '../types';

export type TutorialStep = {
    id: number;
    title: string;
    text: string;
    highlightArea: string; // Used to block UI or highlight specific parts
    actionRequired?: string; // 'click_residential', 'place_house', etc.
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
        title: "Строим первый дом",
        text: "Людям негде жить! Откройте вкладку 'Жильё' в нижнем меню.",
        highlightArea: "toolbar_residential",
        actionRequired: "click_residential"
    },
    {
        id: 3,
        title: "Малый дом",
        text: "Каждый дом дает прирост населения. Выберите 'Малый дом' и постройте его на траве рядом с дорогой!",
        highlightArea: "toolbar_small_house",
        actionRequired: "place_house"
    },
    {
        id: 4,
        title: "Бизнес и налоги",
        text: "Жителям нужно где-то работать и тратить деньги. Откройте вкладку 'Коммерция'.",
        highlightArea: "toolbar_commercial",
        actionRequired: "click_commercial"
    },
    {
        id: 5,
        title: "Строим Магазин",
        text: "Магазины приносят налоги в казну! Постройте один магазин недалеко от домов.",
        highlightArea: "toolbar_store",
        actionRequired: "place_store"
    },
    {
        id: 6,
        title: "Заводы и Экология",
        text: "Теперь откройте вкладку 'Промышленность'. Нам нужны фабрики для снабжения магазинов.",
        highlightArea: "toolbar_industrial",
        actionRequired: "click_industrial"
    },
    {
        id: 7,
        title: "Осторожно, Загрязнение!",
        text: "Заводы приносят много денег, но сильно загрязняют воздух. Обратите внимание на цвет клеток. Из-за загрязнения падает Счастье жителей! Старайтесь строить заводы подальше от домов. Постройте завод сейчас.",
        highlightArea: "toolbar_factory",
        actionRequired: "place_factory"
    },
    {
        id: 8,
        title: "Миссии и Бонусы",
        text: "Отлично! Слева вы видите Миссии, выполняя их, вы получаете награды. А если не хватает денег — жмите на светящийся Подарок! Удачи, Мэр!",
        highlightArea: "missions_and_gift"
    }
];

export class TutorialManager {
    static getStep(stepId: number): TutorialStep | undefined {
        return TUTORIAL_STEPS.find(s => s.id === stepId);
    }
}

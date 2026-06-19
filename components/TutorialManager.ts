import { BuildingType } from '../types';

export type TutorialStep = {
    id: number;
    title: string;
    text: string;
    highlightArea: string; // 'center', 'stats', 'toolbar', 'top-buttons'
};

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 1,
        title: "Добро пожаловать, Мэр!",
        text: "Ваш новый город ждет! Давайте проведем небольшую экскурсию по основным элементам управления, чтобы вы быстрее освоились.",
        highlightArea: "center"
    },
    {
        id: 2,
        title: "Ваши Показатели",
        text: "Здесь отображается ваш Бюджет, Население и Счастье жителей. Если счастье упадет, люди начнут уезжать, а налоги снизятся!",
        highlightArea: "stats"
    },
    {
        id: 3,
        title: "Панель Строительства",
        text: "Внизу находятся инструменты: Инфраструктура (дороги), Зоны (дома, магазины, заводы) и Снос. Используйте их для застройки города.",
        highlightArea: "toolbar"
    },
    {
        id: 4,
        title: "Улучшения и Новости",
        text: "Здесь вы можете прокачивать город за очки уровня (кнопка Улучшения) и читать важные уведомления в разделе Новости.",
        highlightArea: "top-buttons"
    },
    {
        id: 5,
        title: "Вперед, к стройке!",
        text: "Теперь вы готовы! Начните с постройки вашей первой дороги, а затем разместите рядом жилой дом. Удачи, Мэр!",
        highlightArea: "center"
    }
];

export class TutorialManager {
    static getStep(stepId: number): TutorialStep | undefined {
        return TUTORIAL_STEPS.find(s => s.id === stepId);
    }
}

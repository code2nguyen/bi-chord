import './styles.scss';
import powerbiVisualsApi from 'powerbi-visuals-api';
import IVisual = powerbiVisualsApi.extensibility.IVisual;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import '../chord/index';
export interface ChordChartProps {
    matrixData: number[][];
    labels?: string[];
    selectionIndexes?: number[];
    colors?: string[];
    strokeColor?: string;
    axisColor?: string;
    hideAxis?: boolean;
    hideLabel?: boolean;
    labelColor?: string;
    labelFontSize?: number;
    chordPadAngle?: number;
    strokeWidth?: number;
    sliceGap?: number;
}
export declare class Visual implements IVisual {
    private static DefaultViewPort;
    private static DefaultMargin;
    private colors;
    private localizationManager;
    private layout;
    private host;
    private eventService;
    private selectionManager;
    private settings;
    private chordChartProps;
    private rootElement;
    private selectionIds;
    constructor(options: VisualConstructorOptions);
    private initLayout;
    private renderChord;
    update(options: VisualUpdateOptions): void;
    private parseChordChartProps;
    getFormattingModel(): powerbi.visuals.FormattingModel;
    private getLabelPanel;
    private getAxisPanel;
    private getChordVisualPanel;
}

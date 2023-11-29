import { LitElement, PropertyValueMap } from 'lit';
import { ChordGroup } from 'd3-chord';
export interface ChordArcLabelData {
    label: string;
    labelColor: string;
    barFillColor: string;
    barStrokeColor: string;
    isCategory: boolean;
    isGrouped: boolean;
}
export interface ChordArcDescriptor extends ChordGroup {
    angleLabels: {
        angle: number;
        label: string;
    }[];
    data: ChordArcLabelData;
}
export declare class ChordChart extends LitElement {
    private static LABEL_MARGIN;
    private static DEFAULT_DY;
    private static POLYLINE_OPACITY;
    private static TICKS_FONT_SIZE;
    private static DEFAULT_FORMAT_VALUE;
    private static DEFAULT_TICK_LINE_COLOR;
    private static DEFAULT_TICK_SHIFT_X;
    static styles: import("lit").CSSResult[];
    matrixData: number[][];
    labels: string[];
    selectionIndexes: number[];
    colors: string[];
    strokeColor: string;
    strokeWidth: number;
    sliceGap: number;
    chordPadAngle: number;
    tickUnit: number;
    axisColor: string;
    hideAxis: boolean;
    hideLabel: boolean;
    labelFontSize: number;
    labelColor: string;
    width: number;
    height: number;
    private $el?;
    private labelGroup;
    private lineGroup;
    private mainGraphicsContext;
    private sliceGroup;
    private tickGroup;
    private chordGroup;
    private svg;
    private viewportWidth;
    private viewportHeight;
    private dimmedOpacity;
    private createChart;
    render(): import("lit-html").TemplateResult<1>;
    protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void;
    updateChart(): void;
    private updateLabels;
    private renderLabels;
    private renderLines;
    private getChordChartLabelLayout;
    private updateRibbon;
    private updateSlices;
    private updateSelection;
    private updateViewport;
    private updateTicks;
    private calculateRadius;
    private cleanLabels;
    private clearNode;
    private clearTicks;
    private sendEvent;
}

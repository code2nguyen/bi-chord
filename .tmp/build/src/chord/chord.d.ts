import { LitElement } from "lit";
export interface ChordDataColor {
    [label: string]: string;
}
export interface ChordLabelOptions {
    show: boolean;
    color: string;
    fontSize: number;
}
export declare class Chord extends LitElement {
    static styles: import("lit").CSSResult[];
    matrixData: number[][];
    sourceLabels: string[];
    targetLabel: string[];
    colors: ChordDataColor;
    tickUnit: number;
    hideTick: boolean;
    labelOptions: ChordLabelOptions;
    render(): import("lit-html").TemplateResult<1>;
}

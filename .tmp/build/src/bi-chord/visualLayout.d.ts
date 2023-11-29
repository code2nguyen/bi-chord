import powerbiVisualsApi from 'powerbi-visuals-api';
import IViewport = powerbiVisualsApi.IViewport;
import { IMargin } from 'powerbi-visuals-utils-svgutils';
export declare class VisualLayout {
    private marginValue;
    private viewportValue;
    private viewportInValue;
    private minViewportValue;
    defaultMargin: IMargin;
    defaultViewport: IViewport;
    constructor(defaultViewport?: IViewport, defaultMargin?: IMargin);
    get margin(): IMargin;
    set margin(value: IMargin);
    get viewport(): IViewport;
    set viewport(value: IViewport);
    get viewportIn(): IViewport;
    get minViewport(): IViewport;
    set minViewport(value: IViewport);
    get viewportInIsZero(): boolean;
    resetMargin(): void;
    private update;
    private static restrictToMinMax;
}

import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
import powerbiVisualsApi from 'powerbi-visuals-api';
import DataView = powerbiVisualsApi.DataView;
import IColorPalette = powerbiVisualsApi.extensibility.IColorPalette;
export declare class AxisSettings {
    show: boolean;
    color: string;
}
export declare class DataPointSettings {
    showAllDataPoints: boolean;
    defaultColor: string;
}
export declare class LabelsSettings {
    show: boolean;
    fontColor: string;
    fontSize: number;
    fontItalic: boolean;
    fontBold: boolean;
    fontUnderline: boolean;
    fontFamily: string;
}
export declare class ChordSettings {
    strokeColor: string;
    strokeWidth: number;
    strokeWidthMin: number;
    strokeWidthMax: number;
}
export declare class Settings extends DataViewObjectsParser {
    axis: AxisSettings;
    dataPoint: DataPointSettings;
    labels: LabelsSettings;
    chord: ChordSettings;
    static PARSE_SETTINGS(dataView: DataView, colorPalette?: IColorPalette): Settings;
}

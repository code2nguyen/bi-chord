// powerbi.extensibility.utils.color
import { ColorHelper } from 'powerbi-visuals-utils-colorutils'

// powerbi.extensibility.utils.chart.dataLabel
import { dataLabelUtils } from 'powerbi-visuals-utils-chartutils'

// powerbi.extensibility.utils.dataview
import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils'
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser

// powerbi
import powerbiVisualsApi from 'powerbi-visuals-api'
import DataView = powerbiVisualsApi.DataView

// powerbi.extensibility
import IColorPalette = powerbiVisualsApi.extensibility.IColorPalette

export class AxisSettings {
  public show: boolean = true
  public color: string = '#212121'
}

export class DataPointSettings {
  public showAllDataPoints: boolean = false
  public defaultColor: string = null
}

export class LabelsSettings {
  public show: boolean = true
  public fontColor: string = dataLabelUtils.defaultLabelColor
  public fontSize: number = dataLabelUtils.DefaultFontSizeInPt
  public fontItalic: boolean = false
  public fontBold: boolean = false
  public fontUnderline: boolean = false
  public fontFamily: string = dataLabelUtils.StandardFontFamily
}

export class ChordSettings {
  public strokeColor: string = '#000000'
  public strokeWidth: number = 0.5
  public strokeWidthMin: number = 0.5
  public strokeWidthMax: number = 1
}

export class Settings extends DataViewObjectsParser {
  public axis: AxisSettings = new AxisSettings()
  public dataPoint: DataPointSettings = new DataPointSettings()
  public labels: LabelsSettings = new LabelsSettings()
  public chord: ChordSettings = new ChordSettings()

  public static PARSE_SETTINGS(dataView: DataView, colorPalette?: IColorPalette): Settings {
    const settings: Settings = this.parse<Settings>(dataView)

    const colorHelper: ColorHelper = new ColorHelper(colorPalette)

    settings.axis.color = colorHelper.getHighContrastColor('foreground', settings.axis.color)

    settings.dataPoint.defaultColor = colorHelper.getHighContrastColor('background', settings.dataPoint.defaultColor)

    settings.labels.fontColor = colorHelper.getHighContrastColor('foreground', settings.labels.fontColor)

    settings.chord.strokeColor = colorHelper.getHighContrastColor('foreground', settings.chord.strokeColor)

    if (colorPalette && colorHelper.isHighContrast) {
      settings.chord.strokeWidth = settings.chord.strokeWidthMax
    } else {
      settings.chord.strokeWidth = settings.chord.strokeWidthMin
    }

    return settings
  }
}

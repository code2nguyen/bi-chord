import './styles.scss'

// powerbi
import powerbiVisualsApi from 'powerbi-visuals-api'
import DataView = powerbiVisualsApi.DataView
import IViewport = powerbiVisualsApi.IViewport
import DataViewObjects = powerbiVisualsApi.DataViewObjects
import DataViewValueColumn = powerbiVisualsApi.DataViewValueColumn
import VisualObjectInstance = powerbiVisualsApi.VisualObjectInstance
import DataViewMetadataColumn = powerbiVisualsApi.DataViewMetadataColumn
import EnumerateVisualObjectInstancesOptions = powerbiVisualsApi.EnumerateVisualObjectInstancesOptions
import DataViewValueColumnGroup = powerbiVisualsApi.DataViewValueColumnGroup
import PrimitiveValue = powerbiVisualsApi.PrimitiveValue
import VisualObjectInstanceEnumeration = powerbiVisualsApi.VisualObjectInstanceEnumeration
import ISelectionId = powerbiVisualsApi.visuals.ISelectionId

// powerbi.extensibility
import IColorPalette = powerbiVisualsApi.extensibility.IColorPalette
import VisualTooltipDataItem = powerbiVisualsApi.extensibility.VisualTooltipDataItem
import IVisual = powerbiVisualsApi.extensibility.IVisual
import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost
import ILocalizationManager = powerbiVisualsApi.extensibility.ILocalizationManager
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions
import ISelectionManager = powerbiVisualsApi.extensibility.ISelectionManager
import IVisualEventService = powerbiVisualsApi.extensibility.IVisualEventService

// powerbi-visuals-utils-dataviewutils
import { dataViewWildcard } from 'powerbi-visuals-utils-dataviewutils'

// powerbi.extensibility.utils.color
import { ColorHelper } from 'powerbi-visuals-utils-colorutils'

// powerbi.extensibility.utils.type
import { pixelConverter as PixelConverter, double as TypeUtilsDouble } from 'powerbi-visuals-utils-typeutils'

// powerbi-visuals-utils-svgutils
import { IMargin } from 'powerbi-visuals-utils-svgutils'

import { render, html } from 'lit'
import { VisualLayout } from './visualLayout'
import { Settings } from './settings'
import { getAxisPanel, getLabelPanel, getChordVisualPanel } from './visualSettingsModel'

import '../chord/index'

export interface ChordChartProps {
  matrixData: number[][]
  labels?: string[]
  selectionIndexes?: number[]
  colors?: string[]
  strokeColor?: string
  axisColor?: string
  hideAxis?: boolean
  hideLabel?: boolean
  labelColor?: string
  labelFontSize?: number
  chordPadAngle?: number
  strokeWidth?: number
  sliceGap?: number
}

export class Visual implements IVisual {
  private static DefaultViewPort: IViewport = { width: 150, height: 150 }
  private static DefaultMargin: IMargin = {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10,
  }
  private colors: IColorPalette
  private localizationManager: ILocalizationManager
  private layout: VisualLayout
  private host: IVisualHost
  private eventService: IVisualEventService
  private selectionManager: ISelectionManager

  private settings: Settings = new Settings()
  private chordChartProps: ChordChartProps
  private rootElement: HTMLElement
  private selectionIds: ISelectionId[] = []

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.localizationManager = this.host.createLocalizationManager()
    this.eventService = options.host.eventService
    this.colors = options.host.colorPalette
    this.rootElement = options.element
    this.initLayout()
  }

  private initLayout() {
    this.layout = new VisualLayout(Visual.DefaultViewPort, Visual.DefaultMargin)
    this.layout.minViewport = Visual.DefaultViewPort
  }

  private renderChord() {
    return html`<setect-chord
      id="chord"
      .matrixData=${this.chordChartProps.matrixData}
      .colors=${this.chordChartProps.colors}
      .width=${this.layout.viewport.width}
      .height=${this.layout.viewport.height}
      .labels=${this.chordChartProps.labels}
    ></setect-chord>`
  }

  public update(options: VisualUpdateOptions) {
    this.eventService.renderingStarted(options)
    try {
      // assert dataView
      if (!options.dataViews || !options.dataViews[0]) {
        return
      }

      // parse settings
      this.settings = Settings.PARSE_SETTINGS(options.dataViews[0], this.colors)
      console.log(this.settings)

      // parse data
      const parseProps = this.parseChordChartProps(options)
      if (parseProps) {
        this.chordChartProps = parseProps.props
        this.selectionIds = parseProps.selectionIds
      }
      console.log(this.chordChartProps)

      this.layout.viewport = options.viewport
      this.layout.viewport = options.viewport
      this.layout.resetMargin()
      this.layout.margin.top = this.layout.margin.bottom =
        PixelConverter.fromPointToPixel(this.settings.labels.fontSize) / 2
      render(this.renderChord(), this.rootElement)
    } catch (e) {
      this.eventService.renderingFailed(options, e)
    }
  }

  private parseChordChartProps(
    options: VisualUpdateOptions
  ): { props: ChordChartProps; selectionIds: ISelectionId[] } | null {
    const matrixData: number[][] = []
    const labels: string[] = []
    const dataView: DataView = options.dataViews[0]
    const categorical = dataView.categorical
    console.log(options)
    const colorHelper = new ColorHelper(
      this.colors,
      { objectName: 'dataPoint', propertyName: 'fill' },
      this.settings.dataPoint.defaultColor
    )

    if (!categorical || !categorical.categories || !categorical.categories[0] || !categorical.values) {
      return null
    }
    const categoryFieldIndex = 0
    const yFieldIndex = 0
    const category = categorical.categories[categoryFieldIndex]
    const categoryValues = category.values
    const values = categorical.values.grouped()
    const categorySize = categoryValues.length
    const valueSize = values.length
    const totalFields = categorySize + valueSize
    const selectionIds: ISelectionId[] = []
    const colors: string[] = []

    for (let i = valueSize - 1; i >= 0; i--) {
      const seriesName = values[i].name.toString()
      const series = values[i]
      const ySeries = series.values[yFieldIndex]
      const row = new Array<number>(totalFields).fill(0)

      for (let j = 0; j < categorySize; j++) {
        row[valueSize + j] = (ySeries.values[categorySize - j - 1] as number) ?? 0
      }

      const selectionId = this.host
        .createSelectionIdBuilder()
        .withSeries(categorical.values, series)
        .createSelectionId()
      const color = colorHelper.getColorForSeriesValue(series.objects, seriesName)
      colors.push(color)
      selectionIds.push(selectionId)
      labels.push(seriesName)

      matrixData.push(row)
    }
    for (let i = categorySize - 1; i >= 0; i--) {
      const row = new Array<number>(totalFields).fill(0)
      const label = categoryValues[i].toString()
      for (let j = 0; j < valueSize; j++) {
        row[j] = matrixData[j][categorySize - i - 1 + valueSize]
      }

      const selectionId = this.host.createSelectionIdBuilder().withCategory(category, i).createSelectionId()
      const color = colorHelper.getColorForSeriesValue(category.objects ? category.objects[i] : null, label)
      colors.push(color)
      selectionIds.push(selectionId)
      labels.push(label)
      matrixData.push(row)
    }

    console.log(selectionIds)
    console.log(colors)

    return {
      props: {
        matrixData,
        labels,
        colors,
      },
      selectionIds,
    }
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    const chordVisualPanel = getChordVisualPanel(
      this.settings,
      this.chordChartProps.labels,
      this.chordChartProps.colors,
      this.selectionIds
    )
    const axisPanel = getAxisPanel(this.settings)
    const labelPanel = getLabelPanel(this.settings)

    return { cards: [chordVisualPanel, axisPanel, labelPanel] }
  }
}

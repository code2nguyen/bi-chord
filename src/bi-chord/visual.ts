import './styles.scss'

// powerbi
import powerbiVisualsApi from 'powerbi-visuals-api'
import DataView = powerbiVisualsApi.DataView
import IViewport = powerbiVisualsApi.IViewport
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
import ITooltipService = powerbiVisualsApi.extensibility.ITooltipService
import TooltipShowOptions = powerbiVisualsApi.extensibility.TooltipShowOptions

// powerbi.extensibility.utils.color
import { ColorHelper } from 'powerbi-visuals-utils-colorutils'

// powerbi.extensibility.utils.type
import { pixelConverter as PixelConverter } from 'powerbi-visuals-utils-typeutils'

// powerbi-visuals-utils-svgutils
import { IMargin } from 'powerbi-visuals-utils-svgutils'

//owerbi-visuals-utils-formattingutils
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils'

import { render, html } from 'lit'
import { VisualLayout } from './visualLayout'
import { Settings } from './settings'
import { getAxisPanel, getLabelPanel, getChordVisualPanel } from './visualSettingsModel'
import '../chord/index'
import { IValueFormatter, getFormatStringByColumn } from 'powerbi-visuals-utils-formattingutils/lib/src/valueFormatter'

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

  private host: IVisualHost

  private colors: IColorPalette
  private localizationManager: ILocalizationManager
  private eventService: IVisualEventService
  private selectionManager: ISelectionManager
  private tooltipService: ITooltipService

  private settings: Settings = new Settings()
  private layout: VisualLayout
  private chordChartProps: ChordChartProps
  private rootElement: HTMLElement
  private selectionIds: ISelectionId[] = []
  private categoryColumnFormatter: IValueFormatter
  private seriesColumnFormatter: IValueFormatter
  private valueColumnFormatter: IValueFormatter
  private handleTouchTimeoutId: number
  private seriesCount: number = 0
  private categoryCount: number = 0
  private categoryDisplayName: string = ''
  private seriesDisplayName: string = ''
  private valueDisplayName: string = ''

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.localizationManager = this.host.createLocalizationManager()
    this.selectionManager = this.host.createSelectionManager()
    this.eventService = options.host.eventService
    this.tooltipService = this.host.tooltipService
    this.colors = options.host.colorPalette
    this.rootElement = options.element

    this.initLayout()
  }

  private initLayout() {
    this.layout = new VisualLayout(Visual.DefaultViewPort, Visual.DefaultMargin)
    this.layout.minViewport = Visual.DefaultViewPort
  }

  private renderChord() {
    return html`<c2-chord
      id="chord"
      @slicePointerOver=${this.handleSlicePointerOver}
      @slicePointerMove=${this.handleSlicePointerMove}
      @slicePointerOut=${this.hideTooltip}
      @ribbonPointerOver=${this.handleRibbonPointerOver}
      @ribbonPointerMove=${this.handleRibbonPointerMove}
      @ribbonPointerOut=${this.hideTooltip}
      @sliceClick=${this.handleSlideClick}
      @svgClick=${this.handleSvgClick}
      .selectionIndexes=${this.chordChartProps.selectionIndexes}
      .matrixData=${this.chordChartProps.matrixData}
      .colors=${this.chordChartProps.colors}
      .width=${this.layout.viewport.width}
      .height=${this.layout.viewport.height}
      .labels=${this.chordChartProps.labels}
    ></c2-chord>`
  }

  public update(options: VisualUpdateOptions) {
    console.log(options)
    this.eventService.renderingStarted(options)
    try {
      // assert dataView
      if (!options.dataViews || !options.dataViews[0]) {
        return
      }
      // update formatter
      this.updateFormatterAndDisplayName(options)

      // parse settings
      this.settings = Settings.PARSE_SETTINGS(options.dataViews[0], this.colors)
      console.log(this.settings)

      // parse data
      const data = this.parseData(options)
      if (data) {
        this.chordChartProps = { ...data.props, selectionIndexes: this.chordChartProps?.selectionIndexes ?? [] }
        this.selectionIds = data.selectionIds
        this.seriesCount = data.seriesCount
        this.categoryCount = data.categoryCount
      } else {
        return
      }
      console.log(data)

      this.layout.viewport = options.viewport
      this.layout.viewport = options.viewport
      this.layout.resetMargin()
      this.layout.margin.top = this.layout.margin.bottom =
        PixelConverter.fromPointToPixel(this.settings.labels.fontSize) / 2

      this.renderChart()
    } catch (e) {
      this.eventService.renderingFailed(options, e)
    }
  }

  private renderChart() {
    render(this.renderChord(), this.rootElement)
  }

  private updateFormatterAndDisplayName(options: VisualUpdateOptions) {
    const dataView: DataView = options.dataViews[0]
    const columns = dataView && dataView.metadata && dataView.metadata.columns
    if (columns) {
      const categoryColumn = columns.filter((x) => x.roles && x.roles['Category'])[0]
      const seriesColumn = columns.filter((x) => x.roles && x.roles['Series'])[0]
      const yColumn = columns.filter((x) => x.roles && x.roles['Y'])[0]
      this.categoryColumnFormatter = valueFormatter.create({
        format: getFormatStringByColumn(categoryColumn, true) || categoryColumn.format,
      })
      this.seriesColumnFormatter = valueFormatter.create({
        format: seriesColumn && (getFormatStringByColumn(seriesColumn, true) || seriesColumn.format),
      })
      this.valueColumnFormatter = valueFormatter.create({
        format: yColumn ? getFormatStringByColumn(yColumn, true) || yColumn.format : '0',
      })
      this.categoryDisplayName = categoryColumn.displayName
      this.seriesDisplayName = seriesColumn.displayName
      this.valueDisplayName = yColumn.displayName
    }
  }

  private parseData(
    options: VisualUpdateOptions
  ): { props: ChordChartProps; selectionIds: ISelectionId[]; seriesCount: number; categoryCount: number } | null {
    const matrixData: number[][] = []
    const labels: string[] = []
    const dataView: DataView = options.dataViews[0]
    const categorical = dataView.categorical
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
    const categoryCount = categoryValues.length
    const seriesCount = values.length
    const totalFields = categoryCount + seriesCount
    const selectionIds: ISelectionId[] = []
    const colors: string[] = []

    for (let i = seriesCount - 1; i >= 0; i--) {
      const series = values[i]
      const seriesName = series.name.toString()
      const ySeries = series.values[yFieldIndex]
      const row = new Array<number>(totalFields).fill(0)
      for (let j = 0; j < categoryCount; j++) {
        row[seriesCount + j] = (ySeries.values[categoryCount - j - 1] as number) ?? 0
      }

      const selectionId = this.host
        .createSelectionIdBuilder()
        .withSeries(categorical.values, series)
        .createSelectionId()
      const color = colorHelper.getColorForSeriesValue(series.objects, seriesName)
      colors.push(color)
      selectionIds.push(selectionId)
      labels.push(this.seriesColumnFormatter.format(seriesName))
      matrixData.push(row)
    }
    for (let i = categoryCount - 1; i >= 0; i--) {
      const row = new Array<number>(totalFields).fill(0)
      const categoryName = categoryValues[i].toString()
      for (let j = 0; j < seriesCount; j++) {
        row[j] = matrixData[j][categoryCount - i - 1 + seriesCount]
      }

      const selectionId = this.host.createSelectionIdBuilder().withCategory(category, i).createSelectionId()
      const color = colorHelper.getColorForSeriesValue(category.objects ? category.objects[i] : null, categoryName)
      colors.push(color)
      selectionIds.push(selectionId)
      labels.push(this.categoryColumnFormatter.format(categoryName))
      matrixData.push(row)
    }
    return {
      props: {
        matrixData,
        labels,
        colors,
      },
      selectionIds,
      seriesCount,
      categoryCount,
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

  private handleSlicePointerOver = (event: any) => {
    if (!this.chordChartProps) return
    const tooltip: TooltipShowOptions = this.createSliceTooltip(event)
    if (event.detail.pointerType === 'touch') {
      this.handleTouchTimeoutId = window.setTimeout(() => {
        this.tooltipService.show(tooltip)
        this.handleTouchTimeoutId = undefined
      }, 500)
    } else {
      this.tooltipService.show(tooltip)
    }
  }

  private handleSlicePointerMove = (event: any) => {
    if (!this.chordChartProps) return
    const tooltip: TooltipShowOptions = this.createSliceTooltip(event)
    this.tooltipService.move(tooltip)
  }

  private handleRibbonPointerOver = (event: any) => {
    if (!this.chordChartProps) return
    const tooltip: TooltipShowOptions = this.createRibbonTooltip(event)
    if (event.detail.pointerType === 'touch') {
      this.handleTouchTimeoutId = window.setTimeout(() => {
        this.tooltipService.show(tooltip)
        this.handleTouchTimeoutId = undefined
      }, 500)
    } else {
      this.tooltipService.show(tooltip)
    }
  }

  private handleRibbonPointerMove = (event: any) => {
    if (!this.chordChartProps) return
    const tooltip: TooltipShowOptions = this.createRibbonTooltip(event)
    this.tooltipService.move(tooltip)
  }

  private createSliceTooltip(event: any): TooltipShowOptions {
    const detail: any = event.detail
    const index = detail.index as number
    const coordinates = [detail.x, detail.y] as number[]
    const tooltipInfo: VisualTooltipDataItem = {
      displayName: this.chordChartProps.labels[index],
      value: this.valueColumnFormatter.format(detail.value),
    }
    const tooltip: TooltipShowOptions = {
      coordinates,
      isTouchEvent: detail.pointerType === 'touch',
      dataItems: [tooltipInfo],
      identities: [this.selectionIds[detail.index]],
    }
    return tooltip
  }

  private createRibbonTooltip(event: any): TooltipShowOptions {
    const detail: any = event.detail
    const sourceIndex = detail.source.index as number
    const targetIndex = detail.target.index as number
    const coordinates = [detail.x, detail.y] as number[]
    const tooltip: TooltipShowOptions = {
      coordinates,
      isTouchEvent: detail.pointerType === 'touch',
      dataItems: [
        {
          displayName: this.getDisplayName(targetIndex),
          value: this.chordChartProps.labels[targetIndex],
        },
        {
          displayName: this.getDisplayName(sourceIndex),
          value: this.chordChartProps.labels[sourceIndex],
        },
        {
          displayName: this.valueDisplayName,
          value: this.valueColumnFormatter.format(detail.source.value),
        },
      ],
      identities: [this.selectionIds[sourceIndex], this.selectionIds[targetIndex]],
    }
    return tooltip
  }

  private getDisplayName(index: number) {
    if (index < this.seriesCount) {
      return this.seriesDisplayName
    } else {
      return this.categoryDisplayName
    }
  }

  public cancelTouchTimeoutEvents() {
    if (this.handleTouchTimeoutId) {
      clearTimeout(this.handleTouchTimeoutId)
    }
  }

  private hideTooltip = () => {
    this.tooltipService.hide({ immediately: true, isTouchEvent: false })
  }

  private handleSlideClick = (event: any) => {
    const index = event.detail.index as number
    const selectionId = this.selectionIds[index]
    this.selectionManager.select(selectionId)
    this.chordChartProps.selectionIndexes = [index]
    this.renderChart()
  }

  private handleSvgClick = () => {
    this.selectionManager.clear()
    this.chordChartProps.selectionIndexes = []
    this.renderChart()
  }
}

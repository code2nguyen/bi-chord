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

    for (let i = 0; i < valueSize; i++) {
      const seriesName = values[i].name.toString()
      const series = values[i]
      const ySeries = series.values[yFieldIndex]
      const row = new Array<number>(totalFields).fill(0)

      for (let j = 0; j < categorySize; j++) {
        row[valueSize + j] = (ySeries.values[j] as number) ?? 0
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
    for (let i = 0; i < categorySize; i++) {
      const row = new Array<number>(totalFields).fill(0)
      const label = categoryValues[i].toString()
      for (let j = 0; j < valueSize; j++) {
        row[j] = matrixData[j][i + valueSize]
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
    const chordVisualPanel = this.getChordVisualPanel()
    const axisPanel = this.getAxisPanel()
    const labelPanel = this.getLabelPanel()

    return { cards: [chordVisualPanel, axisPanel, labelPanel] }
  }

  private getLabelPanel(): powerbiVisualsApi.visuals.FormattingCard {
    return {
      displayName: 'Labels',
      uid: '86fe92d2-3a59-435b-a8bd-4a577f70a7a5',
      topLevelToggle: {
        uid: '8e45640e-e52a-49bd-a819-8e7822c80ffb',
        suppressDisplayName: true,
        control: {
          type: powerbi.visuals.FormattingComponent.ToggleSwitch,
          properties: {
            descriptor: {
              objectName: 'labels',
              propertyName: 'show',
            },
            value: this.settings.labels.show,
          },
        },
      },
      groups: [
        {
          displayName: 'Text',
          uid: 'dd5cf04f-91c6-4f9a-9fbb-6998dcc3f2e1',
          slices: [
            {
              displayName: 'Font Color',
              uid: 'dda4303a-6d65-479b-97ac-81f21fe505b9',
              control: {
                type: powerbi.visuals.FormattingComponent.ColorPicker,
                properties: {
                  descriptor: {
                    objectName: 'labels',
                    propertyName: 'fontColor',
                  },
                  value: { value: this.settings.labels.fontColor },
                },
              },
            },

            {
              uid: 'data_font_control_slice_uid',
              displayName: 'Font',
              control: {
                type: powerbi.visuals.FormattingComponent.FontControl,
                properties: {
                  fontFamily: {
                    descriptor: {
                      objectName: 'labels',
                      propertyName: 'fontFamily',
                    },
                    value: this.settings.labels.fontFamily,
                  },
                  fontSize: {
                    descriptor: {
                      objectName: 'labels',
                      propertyName: 'fontSize',
                    },
                    value: this.settings.labels.fontSize,
                  },
                  bold: {
                    descriptor: {
                      objectName: 'labels',
                      propertyName: 'fontBold',
                    },
                    value: false,
                  },
                  italic: {
                    descriptor: {
                      objectName: 'labels',
                      propertyName: 'fontItalic',
                    },
                    value: false,
                  },
                  underline: {
                    descriptor: {
                      objectName: 'labels',
                      propertyName: 'fontUnderline',
                    },
                    value: false,
                  },
                },
              },
            },
          ],
        },
      ],
      revertToDefaultDescriptors: [
        {
          objectName: 'labels',
          propertyName: 'show',
        },
      ],
    }
  }

  private getAxisPanel(): powerbiVisualsApi.visuals.FormattingCard {
    return {
      displayName: 'Axis',
      uid: '4f364976-a3c7-4928-9189-368113d855f5',
      topLevelToggle: {
        uid: '33a44b97-5882-461c-9cba-7db713ff5c57',
        suppressDisplayName: true,
        control: {
          type: powerbi.visuals.FormattingComponent.ToggleSwitch,
          properties: {
            descriptor: {
              objectName: 'axis',
              propertyName: 'show',
            },
            value: this.settings.axis.show,
          },
        },
      },
      groups: [],
      revertToDefaultDescriptors: [
        {
          objectName: 'axis',
          propertyName: 'show',
        },
      ],
    }
  }

  private getChordVisualPanel() {
    const chordVisualPanel: powerbi.visuals.FormattingCard = {
      displayName: 'Chord',
      uid: '259a0f0c-ab02-4c72-a362-50299082acb5',
      groups: [],
      revertToDefaultDescriptors: [
        {
          objectName: 'dataPoint',
          propertyName: 'defaultColor',
        },
        {
          objectName: 'dataPoint',
          propertyName: 'showAllDataPoints',
        },
        {
          objectName: 'dataPoint',
          propertyName: 'fill',
        },
      ],
    }

    const dataColors: powerbi.visuals.FormattingGroup = {
      displayName: 'Data colors',
      uid: '8bb6f295-d4a6-4854-a65a-2c54bc7cfda8',
      slices: [
        {
          displayName: 'Default color',
          uid: '8b95ba8b-349c-4f75-a94b-44a838f551ab',
          control: {
            type: powerbi.visuals.FormattingComponent.ColorPicker,
            properties: {
              descriptor: {
                objectName: 'dataPoint',
                propertyName: 'defaultColor',
              },
              value: { value: this.settings.dataPoint.defaultColor },
            },
          },
        },
        {
          displayName: 'Show all',
          uid: 'cbc40e4c-bbc1-4546-97d1-25dc9b9f5c92',
          control: {
            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
            properties: {
              descriptor: {
                objectName: 'dataPoint',
                propertyName: 'showAllDataPoints',
              },
              value: this.settings.dataPoint.showAllDataPoints,
            },
          },
        },
      ],
    }

    if (this.settings.dataPoint.showAllDataPoints) {
      this.chordChartProps.labels.forEach((label, index) => {
        dataColors.slices.push({
          displayName: label,
          uid: `labelColor_${label}_${index}_uid`,
          control: {
            type: powerbi.visuals.FormattingComponent.ColorPicker,
            properties: {
              descriptor: {
                objectName: 'dataPoint',
                propertyName: 'fill',
                selector: this.selectionIds[index].getSelector(),
                instanceKind: powerbi.VisualEnumerationInstanceKinds.Constant,
              },
              value: { value: this.chordChartProps.colors[index] },
            },
          },
        })
      })
    }

    chordVisualPanel.groups.push(dataColors)

    return chordVisualPanel
  }
}

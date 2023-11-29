import { LitElement, html, css, PropertyValueMap } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { select, Selection } from 'd3-selection'
import { arc, Arc, DefaultArcObject } from 'd3-shape'
import { chord, ribbon, Chords, ChordLayout, ChordGroup } from 'd3-chord'
import { sum, range } from 'd3-array'
// powerbi.extensibility.utils.chart
import {
  dataLabelInterfaces,
  legendInterfaces,
  DataLabelManager,
  DataLabelArrangeGrid,
  dataLabelUtils,
} from 'powerbi-visuals-utils-chartutils'
// powerbi.extensibility.utils.svg
import {
  manipulation,
  IMargin,
  IRect,
  shapes,
  Rect,
  CssConstants,
  shapesInterfaces,
} from 'powerbi-visuals-utils-svgutils'
import { valueFormatter } from 'powerbi-visuals-utils-formattingutils'
import { pixelConverter as PixelConverter, double as TypeUtilsDouble } from 'powerbi-visuals-utils-typeutils'
import lessWithPrecision = TypeUtilsDouble.lessWithPrecision
import ILabelLayout = dataLabelInterfaces.ILabelLayout
import { valueFormatter as ValueFormatter } from 'powerbi-visuals-utils-formattingutils'
import createFormatter = ValueFormatter.create

import { isEmpty, max, min } from 'lodash-es'
import translate = manipulation.translate
import { LabelEnabledDataPoint } from 'powerbi-visuals-utils-chartutils/lib/dataLabel/dataLabelInterfaces'
import { translateAndRotate } from 'powerbi-visuals-utils-svgutils/lib/manipulation'

export interface ChordArcLabelData {
  label: string
  labelColor: string
  barFillColor: string
  barStrokeColor: string
  isCategory: boolean
  isGrouped: boolean
}

export interface ChordArcDescriptor extends ChordGroup {
  angleLabels: { angle: number; label: string }[]
  data: ChordArcLabelData
}

@customElement('setect-chord')
export class ChordChart extends LitElement {
  private static LABEL_MARGIN = 10
  private static DEFAULT_DY = '.35em'
  private static POLYLINE_OPACITY = 0.5
  private static TICKS_FONT_SIZE = 12
  private static DEFAULT_FORMAT_VALUE: string = '0.##'
  private static DEFAULT_TICK_LINE_COLOR: string = '#000'
  private static DEFAULT_TICK_SHIFT_X: number = 8

  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        cursor: pointer;
      }
      .setect-chord {
        position: absolute;
      }
      path.chord {
        fill-opacity: 0.67;
      }
      polyline {
        stroke-width: 1px;
        fill: rgba(0, 0, 0, 0);
      }

      .tick-text {
        pointer-events: none;
        font-size: ${ChordChart.TICKS_FONT_SIZE}px;
      }
    `,
  ]

  // Data
  @property({ type: Array }) matrixData: number[][] = []
  @property({ type: Array }) labels: string[] = []
  @property({ type: Array }) selectionIndexes: number[] = []

  // Styles
  @property({ type: Array }) colors: string[] = []
  @property({ type: String }) strokeColor = '#000000'
  @property({ type: Number }) strokeWidth = 0.5

  @property({ type: Number }) sliceGap = 0
  @property({ type: Number }) chordPadAngle = 0.1

  @property({ type: Number }) tickUnit = 5
  @property({ type: String }) axisColor = '#212121'
  @property({ type: Boolean }) hideAxis = false

  @property({ type: Boolean }) hideLabel = false
  @property({ type: Boolean }) labelFontSize = 9
  @property({ type: Boolean }) labelColor = 'rgb(119, 119, 119'

  @property({ type: Number }) width = 0
  @property({ type: Number }) height = 0

  private $el?: SVGElement

  private labelGroup: Selection<any, any, any, any>
  private lineGroup: Selection<any, any, any, any>
  private mainGraphicsContext: Selection<any, any, any, any>
  private sliceGroup: Selection<any, any, any, any>
  private tickGroup: Selection<any, any, any, any>
  private chordGroup: Selection<any, any, any, any>
  private svg: Selection<any, any, any, any>

  private viewportWidth: number
  private viewportHeight: number
  private dimmedOpacity: number = 0.2

  private createChart() {
    console.log('createChart')
    // eslint-disable-next-line powerbi-visuals/no-http-string
    this.$el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.$el.classList.add('setect-chord')

    this.svg = select(this.$el)

    const svgSelection = (this.mainGraphicsContext = this.svg.append('g'))
    this.chordGroup = svgSelection.append('g').classed('chords', true)
    this.sliceGroup = svgSelection.append('g').classed('slices', true)
    this.tickGroup = svgSelection.append('g').classed('ticks', true)
    this.labelGroup = svgSelection.append('g').classed('labels', true)
    this.lineGroup = svgSelection.append('g').classed('lines', true)
    this.svg
      .on('click', (event) => this.sendEvent('svgClick', event))
      .on('contextmenu', (event) => this.sendEvent('rightClick', event))
    return this.$el
  }

  render() {
    return html`${this.createChart()}`
  }

  protected override updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(_changedProperties)
    this.updateChart()
    this.updateSelection()
  }

  updateChart() {
    if (!this.$el || !this.matrixData || this.matrixData.length == 0) {
      return
    }
    this.viewportWidth = this.width || this.clientWidth
    this.viewportHeight = this.height || this.clientHeight

    const { radius, innerRadius } = this.calculateRadius()
    const chordGen = chord().padAngle(this.chordPadAngle)

    const arcVal = arc().innerRadius(innerRadius).outerRadius(radius)
    const chords = chordGen(this.matrixData)

    // Center chart
    this.updateViewport()

    this.updateSlices(chords, arcVal)
    this.updateRibbon(radius, chords)
    this.updateLabels(radius, innerRadius, chords)
    this.updateTicks(radius, innerRadius, chords)
  }

  private updateLabels(radius: number, innerRadius: number, chordVals: Chords) {
    if (!this.hideLabel) {
      // Multiplier to place the end point of the reference line at 0.05 * radius away from the outer edge of the chord/pie.
      const middleRadius = innerRadius + (radius - innerRadius) / 2
      const outerArc = arc().innerRadius(middleRadius).outerRadius(middleRadius)
      const labelLayout = this.getChordChartLabelLayout(outerArc, radius)
      const dataLabelManager = new DataLabelManager()
      const filteredData = dataLabelManager.hideCollidedLabels(
        {
          width: this.viewportWidth,
          height: this.viewportHeight,
        },
        chordVals.groups.map((g) => ({ ...g, label: this.labels[g.index], labelColor: this.labelColor })),
        labelLayout,
        true
      )
      this.renderLabels(filteredData, labelLayout)
      const innerLineRadius = innerRadius + (radius - innerRadius) / 10
      const innerrArc = arc().innerRadius(innerLineRadius).outerRadius(innerLineRadius)
      this.renderLines(filteredData, innerrArc, outerArc, radius)
    } else {
      this.cleanLabels()
    }
  }

  private renderLabels(filteredData: LabelEnabledDataPoint[], layout: ILabelLayout): void {
    // Check for a case where resizing leaves no labels - then we need to remove the labels "g"
    if (filteredData.length === 0) {
      this.cleanLabels()
      return null
    }

    let dataLabels = this.labelGroup.selectAll('text.label').data(filteredData)
    dataLabels.exit().remove()
    dataLabels = dataLabels.merge(dataLabels.enter().append('text').classed('label', true))
    dataLabels
      .attr('x', (d: LabelEnabledDataPoint) => d.labelX)
      .attr('y', (d: LabelEnabledDataPoint) => d.labelY)
      .attr('dy', ChordChart.DEFAULT_DY)
      .text((d: LabelEnabledDataPoint) => d.labeltext)

    Object.keys(layout.style).forEach((x) => dataLabels.style(x, layout.style[x]))
  }

  private renderLines(
    filteredData: LabelEnabledDataPoint[],
    innerrArc: Arc<any, DefaultArcObject>,
    outerArc: Arc<any, DefaultArcObject>,
    radius: number
  ): void {
    let lines = this.lineGroup.selectAll('polyline.line').data(filteredData)
    const midAngle = (d: ChordGroup) => d.startAngle + (d.endAngle - d.startAngle) / 2
    lines.exit().remove()
    lines = lines.merge(lines.enter().append('polyline').classed('line', true))
    lines
      .attr('points', (d: any): any => {
        const textPoint = outerArc.centroid(<any>d)
        textPoint[0] = (radius + ChordChart.LABEL_MARGIN / 2) * (midAngle(d) < Math.PI ? 1 : -1)
        const midPoint = outerArc.centroid(d)
        const chartPoint = innerrArc.centroid(d)

        return [chartPoint, midPoint, textPoint]
      })
      .style('opacity', ChordChart.POLYLINE_OPACITY)
      .style('stroke', (d: any) => d.labelColor)
      .style('pointer-events', 'none')
  }

  private getChordChartLabelLayout(outerArc: Arc<any, DefaultArcObject>, radius: number): ILabelLayout {
    const midAngle = (d: ChordGroup) => d.startAngle + (d.endAngle - d.startAngle) / 2
    const maxLabelWidth = (this.viewportWidth - radius * 2 - ChordChart.LABEL_MARGIN * 2) / 1.6

    return {
      labelText: (d) => {
        // show only category label
        return dataLabelUtils.getLabelFormattedText({
          label: d.label,
          maxWidth: maxLabelWidth,
          fontSize: PixelConverter.fromPointToPixel(this.labelFontSize),
        })
      },
      labelLayout: {
        x: (d: ChordGroup) => (radius + ChordChart.LABEL_MARGIN) * (midAngle(d) < Math.PI ? 1 : -1),
        y: (d: ChordGroup) => {
          const pos = outerArc.centroid(<any>d)
          return pos[1]
        },
      },
      filter: (d) => d !== null && d.label,
      style: {
        fill: (d: any) => d.labelColor,
        'text-anchor': (d: any) => (midAngle(d) < Math.PI ? 'start' : 'end'),
        'font-size': () => PixelConverter.fromPointToPixel(this.labelFontSize),
      },
    }
  }

  private updateRibbon(radius: number, chordVals: Chords) {
    const ribbonGen: any = ribbon().radius(radius)
    let chordShapes = this.chordGroup.selectAll('path.chord').data(
      chordVals.map((c) => {
        return {
          ...c,
          barFillColor: this.colors[c.target.index],
          barStrokeColor: this.strokeColor || this.colors[c.target.index],
          strokeWidth: this.strokeWidth,
        }
      })
    )
    chordShapes.exit().remove()
    chordShapes = chordShapes.merge(chordShapes.enter().append('path').classed('chord', true))
    chordShapes
      .style('fill', (d) => d.barFillColor)
      .style('stroke', (d) => d.barStrokeColor)
      .style('stroke-width', PixelConverter.toString(this.strokeWidth))
      .attr('d', ribbonGen)
      .on('click', (event) => this.sendEvent('ribbonClick', event))
      .on('pointerover', (event) => this.sendEvent('ribbonPointerOver', event))
      .on('pointerout', (event) => this.sendEvent('ribbonPointerOut', event))
      .on('pointermove', (event) => this.sendEvent('ribbonPointerMove', event))
  }

  private updateSlices(chordVals: Chords, arcVal: Arc<any, DefaultArcObject>) {
    let sliceShapes = this.sliceGroup.selectAll('path.slice').data(
      chordVals.groups.map((g) => {
        return { ...g, barFillColor: this.colors[g.index], barStrokeColor: this.colors[g.index] }
      })
    )
    sliceShapes.exit().remove()
    sliceShapes = sliceShapes.merge(sliceShapes.enter().append('path').classed('slice', true))
    sliceShapes
      .style('fill', (d) => d.barFillColor)
      .style('stroke', (d) => d.barStrokeColor)
      .attr('d', (d) => arcVal(<any>d))
      .on('click', (event) => this.sendEvent('sliceClick', event))
      .on('pointerover', (event) => this.sendEvent('slicePointerOver', event))
      .on('pointerout', (event) => this.sendEvent('slicePointerOut', event))
      .on('pointermove', (event) => this.sendEvent('slicePointerMove', event))
  }

  private updateSelection() {
    if (this.selectionIndexes.length === 0) {
      this.sliceGroup.selectAll('path.slice').style('opacity', 1)
      this.chordGroup.selectAll('path.chord').style('opacity', 1)
    } else if (this.selectionIndexes.length === 1) {
      this.chordGroup.selectAll('path.chord').style('opacity', (d: any) => {
        return d.source.index == this.selectionIndexes[0] ? 1 : this.dimmedOpacity
      })
      this.sliceGroup.selectAll('path.slice').style('opacity', (d: any) => {
        return d.index == this.selectionIndexes[0] ? 1 : this.dimmedOpacity
      })
    }
  }

  private updateViewport() {
    this.svg.attr('width', this.viewportWidth).attr('height', this.viewportHeight)
    this.mainGraphicsContext.attr('transform', translate(this.viewportWidth / 2, this.viewportHeight / 2))
  }

  private updateTicks(radius: number, innerRadius: number, chords: Chords) {
    if (this.hideAxis) {
      this.clearTicks()
      return
    }
    const groups = chords.groups
    const maxValue = (!isEmpty(groups) && max(groups.map((g) => g.value))) || 0
    const minValue = (!isEmpty(groups) && min(groups.map((g) => g.value))) || 0
    const radiusCoeff = (radius / Math.abs(maxValue - minValue)) * 1.25

    const formatter = createFormatter({
      format: ChordChart.DEFAULT_FORMAT_VALUE,
      value: maxValue,
    })

    const rangeValues = chords.groups.map((g) => {
      const k = (g.endAngle - g.startAngle) / g.value
      const absValue = Math.abs(g.value)
      let rangeValue = range(0, absValue, absValue - 1 < 0.15 ? 0.15 : absValue - 1)
      if (g.value < 0) {
        rangeValue = rangeValue.map((x) => x * -1).reverse()
      }
      for (let i = 1; i < rangeValue.length; i++) {
        const gapSize = Math.abs(rangeValue[i] - rangeValue[i - 1]) * radiusCoeff
        if (gapSize < ChordChart.TICKS_FONT_SIZE) {
          if (rangeValue.length > 2 && i === rangeValue.length - 1) {
            rangeValue.splice(--i, 1)
          } else {
            rangeValue.splice(i--, 1)
          }
        }
      }
      return rangeValue.map((v) => <any>{ angle: v * k + g.startAngle, label: formatter.format(v) })
    })

    let tickShapes = this.tickGroup.selectAll('g.slice-ticks').data(rangeValues)
    tickShapes.exit().remove()

    tickShapes = tickShapes.merge(tickShapes.enter().append('g').classed('slice-ticks', true))

    let tickPairs = tickShapes.selectAll('g.tick-pair').data((d) => d)
    tickPairs.exit().remove()
    tickPairs = tickPairs.merge(tickPairs.enter().append('g').classed('tick-pair', true))
    tickPairs.attr('transform', (d: any) =>
      translateAndRotate(innerRadius, 0, -innerRadius, 0, (d.angle * 180) / Math.PI - 90)
    )

    let tickLines = tickPairs.selectAll('line.tick-line').data((d) => [d])
    tickLines.exit().remove()
    tickLines = tickLines.merge(tickLines.enter().append('line').classed('tick-line', true))

    tickLines
      .style('stroke', ChordChart.DEFAULT_TICK_LINE_COLOR)
      .attr('x1', 1)
      .attr('y1', 0)
      .attr('x2', 5)
      .attr('y2', 0)
      .merge(tickLines)

    let tickText = tickPairs.selectAll('text.tick-text').data((d) => [d])
    tickText.exit().remove()
    tickText = tickText.merge(tickText.enter().append('text'))
    tickText
      .classed('tick-text', true)
      .attr('x', ChordChart.DEFAULT_TICK_SHIFT_X)
      .attr('dy', ChordChart.DEFAULT_DY)
      .text((d) => (<any>d).label)
      .style('text-anchor', (d) => ((<any>d).angle > Math.PI ? 'end' : null))
      .style('fill', this.axisColor)
      .attr('transform', (d) => ((<any>d).angle > Math.PI ? 'rotate(180)translate(-16)' : null))
  }

  private calculateRadius() {
    let radius = 0
    if (this.hideLabel) {
      radius = Math.min(this.viewportHeight, this.viewportWidth) / 2
    }

    // if we have category or data labels, use a sigmoid to blend the desired denominator from 2 to 3.
    // if we are taller than we are wide, we need to use a larger denominator to leave horizontal room for the labels.
    const hw = this.viewportHeight / this.viewportWidth
    const denom = 2 + 1 / (1 + Math.exp(-5 * (hw - 1)))
    radius = Math.min(this.viewportHeight, this.viewportWidth) / denom

    const innerRadius = this.sliceGap ? radius - this.sliceGap : radius * 0.8
    return { radius, innerRadius }
  }

  private cleanLabels() {
    this.clearNode(this.labelGroup, 'text.label')
    this.clearNode(this.lineGroup, 'polyline.line')
  }

  private clearNode(selector: Selection<any, any, any, any>, selectorName: string): void {
    const empty: any[] = []
    const selectors = selector.selectAll(selectorName).data(empty)
    selectors.exit().remove()
  }

  private clearTicks(): void {
    this.clearNode(this.mainGraphicsContext, '.tick-line')
    this.clearNode(this.mainGraphicsContext, '.tick-pair')
    this.clearNode(this.mainGraphicsContext, '.tick-text')
    this.clearNode(this.mainGraphicsContext, '.slice-ticks')
  }

  private sendEvent(eventName: string, event: any) {
    const dataPoint: any = select(event.target).datum()
    const customEvent = new CustomEvent(eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { ...dataPoint, x: event.clientX, y: event.clientY, pointerType: event.pointerType },
    })

    this.dispatchEvent(customEvent)
    event.stopPropagation()
    event.preventDefault()
  }
}

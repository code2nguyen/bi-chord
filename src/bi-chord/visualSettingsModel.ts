import powerbi from 'powerbi-visuals-api'
import { dataViewWildcard } from 'powerbi-visuals-utils-dataviewutils'
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel'
import { BarChartDataPoint } from './barChart'

class LabelSettingPanel extends formattingSettings.CompositeCard {
  // Formatting property `show` toggle switch (formatting simple slice)

  topLevelSlice = new formattingSettings.ToggleSwitch({
    name: 'show',
    displayName: undefined,
    value: false,
  })
  displayName = 'Labels'
  name = 'labels'
  analyticsPane = false
  groups = []
}

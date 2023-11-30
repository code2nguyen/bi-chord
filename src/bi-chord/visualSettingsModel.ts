import powerbiVisualsApi from 'powerbi-visuals-api'
import { Settings } from './settings'

import ISelectionId = powerbiVisualsApi.visuals.ISelectionId

export function getAxisPanel(settings: Settings): powerbiVisualsApi.visuals.FormattingCard {
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
          value: settings.axis.show,
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

export function getLabelPanel(settings: Settings): powerbiVisualsApi.visuals.FormattingCard {
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
          value: settings.labels.show,
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
                value: { value: settings.labels.fontColor },
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
                  value: settings.labels.fontFamily,
                },
                fontSize: {
                  descriptor: {
                    objectName: 'labels',
                    propertyName: 'fontSize',
                  },
                  value: settings.labels.fontSize,
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

export function getChordVisualPanel(
  settings: Settings,
  labels: string[],
  labelColors: string[],
  selectionIds: ISelectionId[]
) {
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
            value: { value: settings.dataPoint.defaultColor },
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
            value: settings.dataPoint.showAllDataPoints,
          },
        },
      },
    ],
  }

  if (settings.dataPoint.showAllDataPoints) {
    labels.forEach((label, index) => {
      dataColors.slices.push({
        displayName: label,
        uid: `labelColor_${label}_${index}_uid`,
        control: {
          type: powerbi.visuals.FormattingComponent.ColorPicker,
          properties: {
            descriptor: {
              objectName: 'dataPoint',
              propertyName: 'fill',
              selector: selectionIds[index].getSelector(),
              instanceKind: powerbi.VisualEnumerationInstanceKinds.Constant,
            },
            value: { value: labelColors[index] },
          },
        },
      })
    })
  }

  chordVisualPanel.groups.push(dataColors)

  return chordVisualPanel
}

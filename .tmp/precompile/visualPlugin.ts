import { Visual } from "../../src/bi-chord/visual";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DialogConstructorOptions = powerbiVisualsApi.extensibility.visual.DialogConstructorOptions;
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var ChordChart751916EB820D4607A25643204135914E_DEBUG: IVisualPlugin = {
    name: 'ChordChart751916EB820D4607A25643204135914E_DEBUG',
    displayName: 'Setect Chord',
    class: 'Visual',
    apiVersion: '5.4.0',
    create: (options?: VisualConstructorOptions) => {
        if (Visual) {
            return new Visual(options);
        }
        throw 'Visual instance not found';
    },
    createModalDialog: (dialogId: string, options: DialogConstructorOptions, initialState: object) => {
        const dialogRegistry = (<any>globalThis).dialogRegistry;
        if (dialogId in dialogRegistry) {
            new dialogRegistry[dialogId](options, initialState);
        }
    },
    custom: true
};
if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["ChordChart751916EB820D4607A25643204135914E_DEBUG"] = ChordChart751916EB820D4607A25643204135914E_DEBUG;
}
export default ChordChart751916EB820D4607A25643204135914E_DEBUG;
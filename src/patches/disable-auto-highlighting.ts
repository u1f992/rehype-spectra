/**
 * - https://prismjs.com/#manual-highlighting
 * - https://github.com/PrismJS/prism/blob/v1.30.0/prism.js#L1189-L1206
 */

declare const window: { Prism?: { manual?: boolean } };

window.Prism = window.Prism || {};
window.Prism.manual = true;

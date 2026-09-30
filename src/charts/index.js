import night1 from './night1.js';
import night2 from './night2.js';
import night3 from './night3.js';
import night4 from './night4.js';
import night5 from './night5.js';
import night6 from './night6.js';
import night7 from './night7.js';

export const CHARTS = [night1, night2, night3, night4, night5, night6, night7];
export const chartById = (id) => CHARTS.find((c) => c.id === id);
export default CHARTS;

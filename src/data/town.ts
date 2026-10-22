/**
 * The projects as a paper town. Ground coordinates are in "ground pixels":
 * x runs along one edge of the paper, y along the other, heights stand up
 * out of it; the scene is turned into an isometric view by CSS (global.css,
 * .town-ground). Each building is a project; the four apps are the larger
 * ones. Positions were laid out by hand around a loop road.
 */
export type Kind = 'tower' | 'clinic' | 'salon' | 'houses' | 'lab' | 'pavilion' | 'office' | 'hall' | 'gallery' | 'kiosk';

export interface Building {
  /** matches Project.name in resume.ts */
  project: string;
  key: string;
  kind: Kind;
  /** the sign floating over the roof */
  label: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  /** the drawn phone shown on the card, for the apps on the stores */
  app?: 'kbz' | 'myancare' | 'magical' | 'z8';
  /** the little thing that happens when the building is hovered */
  life: string;
}

export const ground = { w: 820, d: 600 };

/** the loop road, as an SVG path in ground pixels; the car drives along it */
export const roadLoop = 'M170 110 H650 V490 H170 Z';
export const roadSpurs = ['M560 490 V600', 'M650 300 H820', 'M170 300 H0'];

export const buildings: Building[] = [
  { project: 'KBZ Wiki — AI-Powered Bank Agent', key: 'kbz', kind: 'tower', label: 'KBZ Wiki', x: 360, y: 225, w: 110, d: 90, h: 190, app: 'kbz', life: 'the agent answers' },
  { project: 'MyanCare TeleHealth App', key: 'myancare', kind: 'clinic', label: 'MyanCare', x: 18, y: 130, w: 120, d: 90, h: 80, app: 'myancare', life: 'an ambulance pulls out' },
  { project: 'Magical Face Luxury Aesthetic Complex', key: 'magical', kind: 'salon', label: 'Magical Face', x: 690, y: 150, w: 100, d: 80, h: 75, app: 'magical', life: 'the door opens' },
  { project: 'Z8 Real Estate', key: 'z8', kind: 'houses', label: 'Z8', x: 690, y: 330, w: 46, d: 150, h: 34, app: 'z8', life: 'the sign swings' },
  { project: 'Benchmark — Clinical Performance Platform', key: 'benchmark', kind: 'lab', label: 'Benchmark', x: 500, y: 340, w: 100, d: 80, h: 70, life: 'the chart grows' },
  { project: 'OYA Health', key: 'oya', kind: 'pavilion', label: 'OYA Health', x: 230, y: 390, w: 90, d: 70, h: 60, life: 'a pulse runs' },
  { project: 'Social Lady', key: 'social-lady', kind: 'office', label: 'Social Lady', x: 520, y: 140, w: 80, d: 70, h: 95, life: 'mail flies out' },
  { project: 'Sun Community Health — NGO', key: 'sch', kind: 'hall', label: 'Sun Community Health', x: 18, y: 440, w: 120, d: 80, h: 60, life: 'the sun comes up' },
  { project: 'Myanmar Ahla Gallery', key: 'ahla', kind: 'gallery', label: 'Myanmar Ahla', x: 372, y: 520, w: 110, d: 70, h: 65, life: 'a show opens' },
  { project: 'Meral Myanmar — Digital Banking', key: 'meral', kind: 'kiosk', label: 'Meral', x: 365, y: 408, w: 60, d: 50, h: 55, life: 'a coin spins' },
];

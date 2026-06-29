export interface InputConfig {
  key: string;
  label: string;
  dataPath: string;
  type: 'input' | 'selection' | 'textarea' | 'time' | 'inputs' | 'intervalTime' | 'date' | 'lien';
  options?: (string | number)[];
  selectionId?: number[];
}

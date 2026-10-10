import { ApiProxy } from './ApiProxy';
import { OMEKA_API_BASE } from '@/utils/omekaApi';

/**
 * Omk.ts
 * A centralized class for Omeka S operations, refactored to use ApiProxy.
 * This class handles resource template fetching, item creation/updating, and data formatting.
 */

export class Omk {
  private api: string | undefined;
  private vocabs: string[];
  public props: any[] | undefined;
  private classes: any[];
  public rts: any[];

  constructor(params: { api?: string; vocabs?: string[] } = {}) {
    this.api = params.api || OMEKA_API_BASE;
    this.vocabs = params.vocabs || ['dcterms', 'foaf', 'fup8', 'bibo'];
    this.props = [];
    this.classes = [];
    this.rts = [];
    this.init = this.init.bind(this);
  }

  public init = () => {
    this.vocabs.forEach((v) => {
      this.getClass(v);
      this.getProps(v);
    });
    this.getRT();
  };

  public getProps = async (prefix: string, cb: ((data: any[]) => void) | false = false): Promise<void> => {
    try {
      const data = await ApiProxy.get(`${this.api}properties?per_page=1000&vocabulary_prefix=${prefix}`);
      if (data && Array.isArray(data)) {
        this.props = [...(this.props || []), ...data];
        if (cb) cb(data);
      }
    } catch (error) {
      console.error(`Error fetching properties for ${prefix}:`, error);
    }
  };

  public getRT = async (cb: ((rts: any[]) => void) | false = false): Promise<void> => {
    try {
      const data = await ApiProxy.get(`${this.api}resource_templates?per_page=1000`);
      if (data) {
        this.rts = data;
        if (cb) cb(this.rts);
      }
    } catch (error) {
      console.error('Error fetching resource templates:', error);
    }
  };

  public getRtId = (label: string): string | number => {
    const rt = this.rts.find((rt) => rt['o:label'] === label);
    return rt ? rt['o:id'] : 0;
  };

  public getPropId = (t: string): string | number | undefined => {
    if (!this.props) return undefined;
    const prop = this.props.find((prp) => prp['o:term'] === t);
    return prop ? prop['o:id'] : undefined;
  };

  public getPropByTerm = (t: string): any | undefined => {
    if (!this.props) return undefined;
    return this.props.find((prp) => prp['o:term'] === t);
  };

  public getClass = async (prefix: string, cb: ((data: any[]) => void) | false = false): Promise<void> => {
    try {
      const data = await ApiProxy.get(`${this.api}resource_classes?per_page=1000&vocabulary_prefix=${prefix}`);
      if (data && Array.isArray(data)) {
        data.forEach((c: any) => this.classes.push(c));
        if (cb) cb(data);
      }
    } catch (error) {
      console.error('Error fetching resource classes:', error);
    }
  };

  public getClassByName = (cl: string): any => {
    return this.classes.find((c) => c['o:label'].toLowerCase() === cl.toLowerCase());
  };

  public getClassByTerm = (cl: string): any => {
    return this.classes.find((c) => c['o:term'].toLowerCase() === cl.toLowerCase());
  };

  public getItem = async (id: string | number, cb: ((rs: any) => void) | false = false): Promise<any> => {
    try {
      const rs = await ApiProxy.get(`${this.api}items/${id}`);
      if (cb) cb(rs);
      return rs;
    } catch (error) {
      console.error('Error fetching item:', error);
      return null;
    }
  };

  public createItem = async (data: any, cb: ((rs: any) => void) | false = false): Promise<any> => {
    try {
      const rs = await ApiProxy.createItem(data);
      if (cb) cb(rs);
      return rs;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  };

  public updateItem = async (id: string | number, data: any, cb: ((rs: any) => void) | false = false): Promise<any> => {
    try {
      const rs = await ApiProxy.updateItem(Number(id), data);
      if (cb) cb(rs);
      return rs;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  public deleteItem = async (id: string | number): Promise<any> => {
    try {
      return await ApiProxy.deleteItem(Number(id));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  };

  /**
   * Refactored from CreateModal's buildObject
   */
  public buildObject = (resourceTemplate: any, formValues: any): any => {
    const template = Array.isArray(resourceTemplate) ? resourceTemplate[0] : resourceTemplate;
    if (!template) return {};

    const RT_props = template['o:resource_template_property'];
    const result: any = {
      '@type': ['o:Item', template['o:resource_class']['@id']],
      'o:resource_class': {
        'o:id': template['o:resource_class']['o:id'],
        '@id': template['o:resource_class']['@id'],
      },
      'o:resource_template': { '@id': template['@id'], 'o:id': template['o:id'] },
    };

    for (const property of RT_props) {
      const term = this.props?.find((prp: any) => prp['o:id'] === property['o:property']['o:id']);
      if (!term) continue;

      const formValueKey = Object.keys(formValues).find((key) => key.split('.')[0] === term['o:term']);
      if (!formValueKey) continue;

      const formValue = formValues[formValueKey];
      if (!result[term['o:term']]) result[term['o:term']] = [];

      if (Array.isArray(formValue)) {
        formValue.forEach((val) => {
          if (term['o:id'] === 1716) {
            result[term['o:term']].push(this.formatValue(term, val.values, val.language));
          } else {
            const nestedVal = Array.isArray(val) ? val[0] : val;
            result[term['o:term']].push(this.formatValue(term, nestedVal));
          }
        });
      } else {
        result[term['o:term']].push(this.formatValue(term, formValue));
      }
    }
    return result;
  };

  /**
   * Refactored from EditModal's buildObject2
   */
  public buildObjectUpdate = (existingObject: any, formValues: any): any => {
    const result = { ...existingObject };
    for (const formValueKey in formValues) {
      if (Object.prototype.hasOwnProperty.call(formValues, formValueKey)) {
        const term_isolated = formValueKey.split('.')[0];
        const term = this.props?.find((prp: any) => prp['o:term'] === term_isolated);
        if (!term) continue;

        const formValue = formValues[formValueKey];
        result[term['o:term']] = [];

        if (Array.isArray(formValue)) {
          const vals = (formValue.length === 1 && Array.isArray(formValue[0])) ? formValue[0] : formValue;
          vals.forEach((value: any) => {
            const formatted = (term['o:id'] === 1716)
              ? this.formatValue(term, value.values, value.language)
              : this.formatValue(term, value);
            result[term['o:term']].push(formatted);
          });
        } else {
          const formatted = (term['o:id'] === 1716)
            ? this.formatValue(term, formValue.values, formValue.language)
            : this.formatValue(term, formValue);
          result[term['o:term']].push(formatted);
        }
      }
    }
    return result;
  };

  public formatValue = (p: any, v: any, language: string = 'fr'): any => {
    const baseValue: any = { property_id: p['o:id'], is_public: true };

    if (p['o:id'] === 1517) {
      baseValue['@id'] = v;
      baseValue.type = 'uri';
    } else if (p['o:id'] === 630) {
      baseValue['@value'] = v;
      baseValue.type = 'numeric:interval';
    } else if (p['o:id'] === 7) {
      baseValue['@value'] = v;
      baseValue.type = 'numeric:timestamp';
    } else if (typeof v === 'number' && (p['o:id'] === 1417 || p['o:id'] === 735)) {
      baseValue['@value'] = v;
      baseValue.type = 'numeric:integer';
    } else if (typeof v === 'number') {
      baseValue.value_resource_id = v;
      baseValue.type = 'resource';
    } else if (typeof v === 'object' && v && v.u) {
      baseValue['@id'] = v.u;
      baseValue['o:label'] = v.l;
      baseValue.type = 'uri';
    } else if (typeof v === 'object' && v) {
      baseValue['@value'] = JSON.stringify(v);
      baseValue.type = 'literal';
    } else {
      baseValue['@value'] = v;
      baseValue.type = 'literal';
    }

    if (p['o:id'] === 1716 && language) {
      baseValue['@language'] = language;
    }
    return baseValue;
  };
}

export default Omk;

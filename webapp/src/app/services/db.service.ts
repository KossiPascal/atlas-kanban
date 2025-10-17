import { Injectable } from '@angular/core';
import { TableName } from '@kba-models/task.model';
import { UserContextService } from './user.context.service';
import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid'; // npm i uuid

export interface BaseEntity {
  id: string;
  updatedAt: number;
  synced?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DBService extends Dexie {
  private initializedTables: Set<string> = new Set();

  private tablesName: TableName[] = ['columns', 'tasks', 'users'];
  private fullTablesName: string[] = [...this.tablesName, 'default_table'];

  constructor(private userCtx: UserContextService) {
    super('AppDatabase');

    const tableShemas: any = {};

    for (const s of this.fullTablesName) {
      tableShemas[s] = 'id';
      tableShemas[s] = 'id,updatedAt,synced';
    }

    // ✅ Define base schema upfront
    this.version(1).stores(tableShemas);

    this.open().catch(err => console.error('DB open failed:', err));

    for (const t of this.tablesName) {
      this.initializedTables.add(t);
    }
  }

  /** Safely ensure table exists, recreating DB if needed */
  private async ensureTable<T = any>(tableName: TableName, data: T) {
    if (this.initializedTables.has(tableName)) return;

    try {
      // On filtre uniquement les clés valides (alphanumériques + _)
      const validKeys = Object.keys(data as any).filter((key) =>
        /^[a-zA-Z0-9_]+$/.test(key)
      );

      if (!validKeys.includes('id')) validKeys.unshift('id'); // on force l'id comme clé primaire

      if (!('synced' in validKeys)) validKeys.push('synced');

      const fields = validKeys.join(',');

      this.version(1).stores({
        [tableName]: fields,
      });

      this.initializedTables.add(tableName);
    } catch (error) {
      console.error('Dexie table creation failed:', error);
      throw error;
    }
  }



  // private async tableRef<T = any>(tableName: TableName, sampleData?: T): Promise<Dexie.Table<T, string>> {
  //   if (!this.initializedTables.has(tableName)) {
  //     if (sampleData) {
  //       await this.ensureTable(tableName, sampleData);
  //     } else {
  //       // si on n’a pas de données, créer au minimum une table avec "id" et "updatedAt"
  //       const fields = Object.keys((sampleData ?? { createdAt: 0, updatedAt: 0 }) as any).join(',');
  //       this.version(1).stores({ [tableName]: `id,${fields}, synced` });
  //       this.initializedTables.add(tableName);
  //     }
  //   }
  //   return this.table(tableName);
  // }

  /** Get table reference (ensure it exists if needed) */
  private async tableRef<T = any>(tableName: TableName, sampleData?: T): Promise<Dexie.Table<T, string>> {
    if (!this.initializedTables.has(tableName)) {
      if (sampleData) {
        await this.ensureTable(tableName, sampleData);
      } else {
        // Default minimal structure
        await this.ensureTable(tableName, { id: '' } as any);
      }
    }
    return this.table(tableName);
  }




  /** Save or update an item */
  async save<T = any>(tableName: TableName, data: T): Promise<boolean> {
    try {
      const now = Date.now();
      const item: T & { id: string; createdAt: number; updatedAt: number; synced: boolean } = {
        ...data,
        id: (data as any).id || (data as any).uid || uuidv4(), // ✅ ensure id exists
        createdAt: (data as any).createdAt || now,
        updatedAt: now,
        synced: (data as any).synced ?? false,
      };

      await this.ensureTable(tableName, item);
      const tableRef = await this.tableRef<T>(tableName);
      await tableRef.put(item);

      return true;
    } catch (error) {
      console.error('DBService.save error:', error);
      return false;
    }
  }

  /** Bulk save items */
  async bulkSave<T = any>(tableName: TableName, items: T[]): Promise<boolean> {
    try {
      if (!items.length) return true;
      const now = Date.now();

      const prepared: (T & { id: string; createdAt: number; updatedAt: number; synced: boolean })[] =
        items.map(i => ({
          ...i,
          id: (i as any).id || (i as any).uid || uuidv4(), // ✅ ensure id exists
          createdAt: (i as any).createdAt || now,
          updatedAt: now,
          synced: (i as any).synced ?? false,
        }));

      await this.ensureTable(tableName, prepared[0]);
      const tableRef = await this.tableRef<T>(tableName);
      await tableRef.bulkPut(prepared);

      return true;
    } catch (error) {
      console.error('DBService.bulkSave error:', error);
      return false;
    }
  }


  /** Save or update an item */
  async update<T = any>(tableName: TableName, data: T): Promise<boolean> {
    try {
      const now = Date.now();
      const item:T = { ...data, updatedAt: now, synced: (data as any).synced ?? false };
      await this.ensureTable(tableName, item);
      const tableRef = await this.tableRef<T>(tableName);
      await tableRef.put(item);
      return true;
    } catch (error) {
      console.error('DBService.update error:', error);
      return false;
    }
  }

  /** Bulk save items */
  async bulkUpdate<T = any>(tableName: TableName, items: T[]): Promise<boolean> {
    try {
      if (!items.length) return true;
      const now = Date.now();
      const prepared = items.map(i => ({ ...i, updatedAt: now, synced: (i as any).synced ?? false }));
      await this.ensureTable(tableName, prepared[0]);
      const tableRef = await this.tableRef<T>(tableName);
      await tableRef.bulkPut(prepared);
      // return prepared;
      return true;
    } catch (error) {
      console.error('DBService.bulkSave error:', error);
      return false;
    }
  }

  /** Get all items */
  async list<T = any>(tableName: TableName): Promise<T[]> {
    try {
      const tableRef = await this.tableRef<T>(tableName);
      return await tableRef.toArray();
    } catch (error) {
      console.error('DBService.all error:', error);
      return [];
    }
  }

  /** Get single item by id */
  async get<T = any>(tableName: TableName, id: string): Promise<T | undefined> {
    try {
      const tableRef = await this.tableRef<T>(tableName);
      return await tableRef.get(id);
    } catch (error) {
      console.error('DBService.get error:', error);
      return undefined;
    }
  }

  async bulkGet<T = any>(tableName: TableName, payload: { field: string; value: string | string[] }): Promise<T[]> {
    try {
      const data = await this.list<T>(tableName);
      const { field, value } = payload;

      if (!field || value === undefined || value === null) {
        throw new Error('Champ ou valeur manquant');
      }

      return data.filter((d) => {
        const fieldValue = (d as any)[field];

        if (Array.isArray(value)) {
          // 🔁 Cas : value est un tableau → on garde les éléments dont la valeur du champ est incluse
          return value.includes(fieldValue);
        } else {
          // 🔤 Cas : value est une string → on compare directement
          return fieldValue === value;
        }
      });
    } catch (error) {
      console.error('DBService.bulkGet error:', error);
      return [];
    }
  }


  /** Get one item */
  async getItem<T = any>(tableName: TableName, id: string): Promise<T | undefined> {
    const tableRef = await this.tableRef<T>(tableName);
    return await tableRef.get(id);
  }

  /** Get data by parentId */
  async getByField<T = any>(tableName: TableName, field: keyof T, value: any): Promise<T[]> {
    try {
      const data = await this.list(tableName);
      return data.filter(t => t[field] === value);
    } catch (err) {
      console.error('Erreur getByField', err);
      return [];
    }
  }

  /** Delete item */
  async deleteItem<T = any>(tableName: TableName, id: string): Promise<boolean> {
    try {
      const user = this.userCtx.currentUser;
      if (!user) return false;
      const data = await this.getItem<T>(tableName, id) as any;
      if (!data) return false;

      const tableRef = await this.tableRef<T>(tableName);
      await tableRef.delete(id);
      return true;
    } catch (error) {
      console.error('DBService.delete error:', error);
      return false;
    }
  }

  /** Delete item */
  async bulkDelete<T = any>(tableName: TableName, ids: string[]): Promise<boolean> {
    try {
      const user = this.userCtx.currentUser;
      if (!user) return false;
      const tableRef = await this.tableRef<T>(tableName);
      await tableRef.bulkDelete(ids);
      return true;
    } catch (error) {
      console.error('DBService.delete error:', error);
      return false;
    }
  }

  /** Get unsynced items */
  async getUnsynced<T = any>(tableName: TableName): Promise<T[]> {
    try {
      const tableRef = await this.tableRef<T>(tableName);
      // try {
      //   // if synced stored as 0/1
      //   return await tableRef.where('synced').equals(false as any).toArray();
      // } catch {
      // fallback: filter manually if boolean stored
      const all = await tableRef.toArray();
      return all.filter((d: any) => d.synced === false);
      // }
    } catch (error) {
      console.error('DBService.getUnsynced error:', error);
      return [];
    }
  }


  /** Mark as synced */
  async markAsSynced<T = any>(tableName: TableName, id: string): Promise<void> {
    try {
      const tableRef = await this.tableRef<T>(tableName);
      await tableRef.update(id, (obj: Partial<T>) => {
        if (obj) {
          (obj as any).synced = true;
          (obj as any).updatedAt = Date.now();
        }
      });
    } catch (error) {
      console.error('DBService.markAsSynced error:', error);
    }
  }
}

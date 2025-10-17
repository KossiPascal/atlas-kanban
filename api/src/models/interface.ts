
export interface Comments { id: string, by: string, at: number, msg: any, updatedAt: number, deleted: boolean };

export interface Task {
  id: string;
  title: string;
  views: { [by: string]: { at: number } };
  comments: Comments[];
}
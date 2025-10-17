
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerIds: string[];
  creationTime: string;
  lastSignInTime: string;
  color?: string; // <-- ajouter couleur
}

export type ColumnId = 'todo' | 'inprogress' | 'needreview' | 'done';

export type TableName = 'columns' | 'tasks' | 'users'

export interface Files {
  id: string;
  name?: string;
  file?: File;
  url?: string;
  size: number
}

export interface Attachment {
  at: number,
  files: Files[]
};

export interface Comments {
  id: string;
  by: string;
  at: number;
  msg: string;
  photoURL?: string;
  reactions?: string[];
  deleted?: boolean;
  editing?: boolean;
  updatedBy?: string;
  updatedAt?: number;
  showActions?: boolean;
  seen?: boolean;
};

export interface Task {
  id: string;
  title: string;
  description: string;
  tag?: Tag;
  checklist?: CheckItem[],
  assignTo?: { [by: string]: { at: number } };
  sharedWith?: { [by: string]: { at: number } };

  views: { [by: string]: { at: number } };
  // comments: { [by: string]: { at: number, msg: any } };

  comments: Comments[];

  attachments: { [by: string]: Attachment };
  priority?: Priority,

  due?: number; // ISO date
  columnId: ColumnId;
  owner?: string;
  createdAt?: number;
  updatedBy?: string;
  updatedAt?: number
  moovedBy?: string;
  moovedAt?: number
  synced?: boolean;
  status?: string
  archived?: boolean;
  position?: number;
  deleted?: boolean
}

export interface Column {
  id: ColumnId;
  title: string;
  color: string;
  // tasks: Task[];
  description?: string;
  owner?: string;
  createdAt?: number;
  updatedBy?: string;
  updatedAt?: number
  synced?: boolean;
}

export interface CheckItem {
  id: string;
  name: string
  done?: { ok: boolean, by: string, at: number }
  created?: { by: string, at: number }
  updated?: { by: string, at: number }
}

export interface DraggedTask {
  task?: Task;
  from?: string;
}

export interface Tag {
  id: string;
  name: string;
  bg: string;
  color: string;
}


export interface Priority {
  id: string;
  name: string;
  label: string;
  big: {
    color: string;
    bg: string;
  };
  small: {
    color: string;
    bg: string;
  };
}[]


// export type TagName = | 'UX stages' | 'Design' | 'Branding' | 'Feature' | 'Bug' | 'Urgent' | 'Review' | 'New'



export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;

  providerId: string; // "firebase"
  providerData: Array<{
    providerId: string;
    uid: string;
    displayName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    photoURL?: string | null;
  }>;

  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };

  stsTokenManager?: {
    accessToken: string;
    refreshToken: string;
    expirationTime: number;
  };
}

export interface TaskFilter {
  priority?: string[] | null;
  assigned?: string[] | null;
  tag?: string[] | null;
  startDate?: string | null;
  endDate?: string | null;
}


import { Injectable, Inject, NotFoundException, BadRequestException, InternalServerErrorException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FIREBASE_ADMIN } from '../firebase-admin.providers';
import * as admin from 'firebase-admin';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Comments, Task } from 'src/models/interface';




@Injectable()
export class TasksService {
  private readonly db: admin.firestore.Firestore;
  private readonly dbName: string = 'tasks';
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: admin.app.App,
    private readonly notifications: NotificationsService,
  ) {
    this.db = this.firebaseAdmin.firestore();
  }

  /**
   * Lister les tâches avec filtres optionnels
   */
  async list<T = any>(filters: Record<string, any> = {}, options: { limit?: number; orderBy?: string; direction?: 'asc' | 'desc' } = {}): Promise<T[]> {
    try {
      let query: FirebaseFirestore.Query = this.db.collection(this.dbName);

      // Ajout dynamique des filtres
      for (const [key, value] of Object.entries(filters)) {
        query = query.where(key, '==', value);
      }

      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.direction || 'asc');
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snap = await query.get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
    } catch (error: any) {
      this.logger.error(`Erreur list(): ${error.message}`);
      throw new InternalServerErrorException(
        `Erreur lors du listing des tâches: ${error.message}`,
      );
    }
  }

  /** Lister par champ spécifique (ex: userId, status) */
  async listByField(field: string, value: any): Promise<Record<string, any>[]> {
    try {
      if (!field || field.trim() == '' || value === undefined || value === null) {
        throw new BadRequestException('Invalid field or value for query');
      }

      const snap = await this.db.collection(this.dbName).where(field, '==', value).get();
      if (snap.empty) return [];

      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Erreur lors du filtrage des tâches par "${field}" = "${value}" : ${error.message}`,
      );
    }
  }

  /** Récupérer une tâche par ID */
  async get(id: string): Promise<Record<string, any>> {
    try {
      if (!id) throw new BadRequestException('ID invalide');

      const doc = await this.db.collection(this.dbName).doc(id).get();
      if (!doc.exists) {
        throw new NotFoundException(`La tâche avec l'ID ${id} n'existe pas`);
      }
      return { id: doc.id, ...doc.data() };
    } catch (error: any) {
      this.logger.error(`Erreur get(${id}): ${error.message}`);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(error.message);
    }
  }

  /** Vérifier si une tâche existe */
  async exists(id: string): Promise<boolean> {
    if (!id) return false;
    const doc = await this.db.collection(this.dbName).doc(id).get();
    return doc.exists;
  }

  /** Créer une nouvelle tâche */
  async create(data: Record<string, any>, useDocMethode = false): Promise<Record<string, any>> {
    try {
      if (!data || typeof data !== 'object') {
        throw new BadRequestException('Les données sont invalides');
      }

      const toSave = { ...data, createdAt: Date.now() };

      let ref: FirebaseFirestore.DocumentReference;
      if (useDocMethode) {
        ref = await this.db.collection(this.dbName).add(toSave);
      } else {
        ref = this.db.collection(this.dbName).doc(data.id || undefined);
        await ref.set(toSave, { merge: true });
      }
      this.logger.log(`Tâche créée: ${ref.path}`);

      const saved = await ref.get();
      if (!saved.exists) throw new Error(`Document non trouvé après création`);

      return { id: ref.id, ...saved.data() };
    } catch (error: any) {
      this.logger.error(`Erreur create(): ${error.message}`);
      throw new BadRequestException(`Impossible de créer la tâche: ${error.message}`);
    }
  }

  /** Récupérer les tâches filtrées par champ (supporte valeur unique ou tableau) */
  async buildGet(field: string, value: any): Promise<Record<string, any>[]> {
    try {
      if (!field || value === undefined || value === null) {
        throw new BadRequestException('Champ ou valeur manquant');
      }

      let query: FirebaseFirestore.Query;

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return [];
        }
        if (value.length > 10) {
          throw new BadRequestException('Firestore "in" query supporte maximum 10 valeurs');
        }

        query = this.db
          .collection(this.dbName)
          .where(field, 'in', value);
      } else {
        query = this.db
          .collection(this.dbName)
          .where(field, '==', value);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error: any) {
      this.logger.error(`Erreur buildGet(): ${error.stack || error.message}`);
      throw new BadRequestException(
        `Impossible de récupérer les tâches: ${error.message}`
      );
    }
  }

  /** Créer plusieurs tâches en batch */
  async bulkCreate(tasks: Record<string, any>[]): Promise<string[]> {
    try {
      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new BadRequestException('Aucune tâche fournie');
      }
      if (tasks.length > 500) {
        throw new BadRequestException('Firestore batch supporte maximum 500 écritures');
      }

      const batch = this.db.batch();
      const ids: string[] = [];

      tasks.forEach((task) => {
        if (!task.id) throw new BadRequestException('ID manquant');
        const ref = this.db.collection(this.dbName).doc(task.id);
        batch.set(ref, {
          ...task,
          createdAt: task.createdAt || Date.now(),
        });
        ids.push(ref.id);
      });

      await batch.commit();
      return ids;
    } catch (error: any) {
      this.logger.error(`Erreur bulkCreate(): ${error.stack || error.message}`);
      throw new BadRequestException(
        `Impossible de créer les tâches: ${error.message}`
      );
    }
  }

  /** Mettre à jour plusieurs tâches en batch */
  async bulkUpdate(tasks: Record<string, any>[]): Promise<string[]> {
    try {
      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new BadRequestException('Aucune tâche fournie');
      }
      if (tasks.length > 500) {
        throw new BadRequestException('Firestore batch supporte maximum 500 écritures');
      }

      const batch = this.db.batch();
      const ids: string[] = [];

      tasks.forEach((task) => {
        if (!task.id) throw new BadRequestException('ID manquant');
        const ref = this.db.collection(this.dbName).doc(task.id);
        batch.update(ref, {
          ...task,
          updatedAt: task.updatedAt || Date.now(),
        });
        ids.push(ref.id);
      });

      await batch.commit();
      return ids;
    } catch (error: any) {
      this.logger.error(`Erreur bulkUpdate(): ${error.stack || error.message}`);
      throw new BadRequestException(
        `Impossible de mettre à jour les tâches: ${error.message}`
      );
    }
  }

  /** Supprimer plusieurs tâches */
  async bulkDelete(ids: string[]): Promise<number> {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestException('Aucun ID fourni');
      }
      if (ids.length > 500) {
        throw new BadRequestException('Firestore batch supporte maximum 500 suppressions');
      }

      const batch = this.db.batch();
      ids.forEach((id) => {
        if (!id) throw new BadRequestException('ID invalide');
        batch.delete(this.db.collection(this.dbName).doc(id));
      });

      await batch.commit();
      return ids.length;
    } catch (error: any) {
      this.logger.error(`Erreur bulkDelete(): ${error.stack || error.message}`);
      throw new BadRequestException(
        `Impossible de supprimer les tâches: ${error.message}`
      );
    }
  }


  /** Mettre à jour une tâche */
  async update(id: string, data: Record<string, any>, useDocMethode = false): Promise<Record<string, any>> {
    try {
      if (!id) throw new BadRequestException('ID manquant');
      if (!(await this.exists(id))) {
        throw new NotFoundException(`La tâche ${id} n'existe pas`);
      }

      const ref = this.db.collection(this.dbName).doc(id);
      data.updatedAt = data.updatedAt || Date.now();

      if (useDocMethode) {
        await ref.update(data);
      } else {
        await ref.set(data, { merge: true });
      }

      const updated = await ref.get();
      return { id: updated.id, ...updated.data() };
    } catch (error: any) {
      this.logger.error(`Erreur update(${id}): ${error.message}`);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(error.message);
    }
  }

  /** Supprimer une tâche */
  async delete(id: string): Promise<{ id: string }> {
    try {
      if (!id) throw new BadRequestException('ID invalide');

      const ref = this.db.collection(this.dbName).doc(id);
      const snap = await ref.get();

      if (!snap.exists) throw new NotFoundException(`La tâche ${id} n'existe pas`);

      await ref.delete();
      return { id };
    } catch (error: any) {
      this.logger.error(`Erreur delete(${id}): ${error.message}`);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(error.message);
    }
  }

  /** Compter les tâches par valeur d’un champ */
  async countByField(field: string, value: any): Promise<number> {
    try {
      const snap = await this.db.collection(this.dbName).where(field, '==', value).get();
      return snap.size;
    } catch (error: any) {
      this.logger.error(`Erreur countByField(${field}): ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  /** Recherche textuelle (full-text simple) */
  async search(field: string, keyword: string): Promise<any[]> {
    try {
      const snap = await this.db
        .collection(this.dbName)
        .where(field, '>=', keyword)
        .where(field, '<=', keyword + '\uf8ff')
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error: any) {
      this.logger.error(`Erreur search(${field}): ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  /** Pagination simple */
  async paginate(limit = 10, startAfterId?: string): Promise<any[]> {
    try {
      let query: FirebaseFirestore.Query = this.db.collection(this.dbName).orderBy('createdAt', 'desc').limit(limit);

      if (startAfterId) {
        const startDoc = await this.db.collection(this.dbName).doc(startAfterId).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snap = await query.get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error: any) {
      this.logger.error(`Erreur paginate(): ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  /** Compter toutes les tâches */
  async count(): Promise<number> {
    try {
      const snap = await this.db.collection(this.dbName).get();
      return snap.size;
    } catch (error: any) {
      this.logger.error(`Erreur count(): ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  /** Vérifie les tâches en retard et envoie une notification */
  async checkLateTasks() {
    try {
      const now = new Date().toISOString();
      const snap = await this.db.collection(this.dbName).where('dueDate', '<', now).get();

      for (const doc of snap.docs) {
        const task = { id: doc.id, ...doc.data() } as any;
        if (!task.notified && task.assignedEmail) {
          await this.notifications.sendEmail(
            task.assignedEmail,
            'Retard de tâche',
            `La tâche "${task.title}" est en retard. Veuillez la traiter rapidement.`,
          );
          await doc.ref.update({ notified: true });
        }
      }
    } catch (error: any) {
      this.logger.error(`Erreur checkLateTasks(): ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }




  /** Get all comments as an array sorted by timestamp */
  async getComments(taskId: string) {
    if (!taskId) throw new BadRequestException('ID requis');

    try {
      const taskRef = this.db.collection('tasks').doc(taskId);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        throw new HttpException({ status: 404, error: 'Tâche introuvable' }, HttpStatus.NOT_FOUND);
      }

      const taskData = taskDoc.data() as Task;
      const comments = taskData.comments || [];

      // Sort chronologically
      return comments.sort((a, b) => a.at - b.at);
    } catch (err: any) {
      throw new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


  /** Add a comment */
  async addComment(data: { taskId: string, by: string, msg: any, at: number }) {

    const { taskId, by, msg, at } = data;

    if (!taskId || !by || !msg) {
      throw new BadRequestException('taskId, by et msg requis');
    }

    try {
      const taskRef = this.db.collection('tasks').doc(taskId);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        throw new HttpException({ status: 404, error: 'Tâche introuvable' }, HttpStatus.NOT_FOUND);
      }

      const timestamp = at ?? Date.now();
      const newComment = { id: taskRef.collection('comments').doc().id, by: by, at: timestamp, msg };

      await taskRef.update({
        comments: admin.firestore.FieldValue.arrayUnion(newComment),
      });

      return newComment;
    } catch (err: any) {
      throw new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Update a comment */
  async updateComment(data: { taskId: string, commentId: string, by: string, msg: any, at: number }) {
    const { taskId, commentId, by, msg, at } = data;

    if (!taskId || !by || !commentId || !msg) {
      throw new BadRequestException('taskId, commentId et newMsg requis');
    }
    try {
      const taskRef = this.db.collection('tasks').doc(taskId);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        throw new HttpException({ status: 404, error: 'Tâche introuvable' }, HttpStatus.NOT_FOUND);
      }

      const taskData = taskDoc.data() as Task;
      const comments = taskData.comments || [];

      const index = comments.findIndex(c => c.id === commentId);
      if (index === -1) {
        throw new HttpException({ status: 404, error: 'Commentaire introuvable' }, HttpStatus.NOT_FOUND);
      }

      // Modify the comment
      comments[index].msg = msg;
      comments[index].updatedAt = at ?? Date.now();

      await taskRef.update({ comments });

      return comments[index];
    } catch (err: any) {
      throw new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Delete a comment (soft delete) */
  async deleteComment(data: { taskId: string, commentId: string }) {
    const { taskId, commentId } = data;

    if (!taskId || !commentId) {
      throw new BadRequestException('taskId et commentId requis');
    }
    try {
      const taskRef = this.db.collection('tasks').doc(taskId);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        throw new HttpException({ status: 404, error: 'Tâche introuvable' }, HttpStatus.NOT_FOUND);
      }

      const taskData = taskDoc.data() as Task;
      const comments = taskData.comments || [];

      const index = comments.findIndex(c => c.id === commentId);
      if (index === -1) {
        throw new HttpException({ status: 404, error: 'Commentaire introuvable' }, HttpStatus.NOT_FOUND);
      }

      // Option 1: Soft delete
      // comments[index].msg = '[deleted]';
      // comments[index].deleted = true;

      // Option 2: Hard delete
      comments.splice(index, 1);

      await taskRef.update({ comments });


      return { ...comments[index], deleted: true };
    } catch (err: any) {
      throw new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }



  // async getComments(taskId: string) {
  //   if (!taskId) {
  //     throw new BadRequestException('ID requis');
  //   }
  //   try {
  //     const taskRef = this.db.collection('tasks').doc(taskId);
  //     const taskDoc = await taskRef.get();

  //     if (!taskDoc.exists) {
  //       throw new HttpException({ status: 404, error: 'Tâche introuvable' }, HttpStatus.NOT_FOUND);
  //     }

  //     const commentsSnap = await taskRef
  //       .collection('comments')
  //       .orderBy('createdAt', 'asc') // ordre chronologique
  //       .get();

  //     return commentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  //   } catch (err: any) {
  //     throw new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // async addComment(taskId: string, body: { text: string; by: string; }) {
  //   if (!taskId || !body.text) {
  //     throw new BadRequestException('TaskId et text requis');
  //   }

  //   try {
  //     const taskRef = this.db.collection('tasks').doc(taskId);
  //     const taskDoc = await taskRef.get();

  //     if (!taskDoc.exists) {
  //       throw new HttpException({ status: 404, error: 'Tâche introuvable' }, HttpStatus.NOT_FOUND);
  //     }

  //     const commentRef = taskRef.collection('comments').doc();

  //     const formatedComment = {
  //       text: body.text,
  //       by: body.by || 'Anonymous',
  //       type: body.type || 'income',
  //       createdAt: Date.now(),
  //     }

  //     await commentRef.set(formatedComment);

  //     return { id: commentRef.id, ...formatedComment };
  //   } catch (err: any) {
  //     throw new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // /** Update an existing comment */
  // async updateComment(taskId: string, commentId: string, updatedText: string) {
  //   if (!taskId || !commentId || !updatedText) {
  //     throw new BadRequestException('taskId, commentId et updatedText requis');
  //   }

  //   try {
  //     const commentRef = this.db.collection('tasks').doc(taskId).collection('comments').doc(commentId);
  //     const commentDoc = await commentRef.get();
  //     if (!commentDoc.exists) {
  //       throw new HttpException({ status: 404, error: 'Commentaire introuvable' }, HttpStatus.NOT_FOUND);
  //     }

  //     await commentRef.update({ text: updatedText, updatedAt: Date.now() });
  //     return { id: commentId, text: updatedText };
  //   } catch (err: any) {
  //     throw new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // /** Soft delete a comment (simulate out-of-style) */
  // async deleteComment(taskId: string, commentId: string) {
  //   if (!taskId || !commentId) {
  //     throw new BadRequestException('taskId et commentId requis');
  //   }

  //   try {
  //     const commentRef = this.db.collection('tasks').doc(taskId).collection('comments').doc(commentId);
  //     const commentDoc = await commentRef.get();
  //     if (!commentDoc.exists) {
  //       throw new HttpException({ status: 404, error: 'Commentaire introuvable' }, HttpStatus.NOT_FOUND);
  //     }




  //     await commentRef.delete();

  //     // Soft delete by marking as deleted
  //     // await commentRef.update({ deleted: true, deletedAt: Date.now() });
  //     return { id: commentId, deleted: true };
  //   } catch (err: any) {
  //     throw new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }
}

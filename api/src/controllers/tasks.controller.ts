import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { TasksService } from '../services/tasks.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { TasksGateway } from '../gateway/tasks.gateway';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Comments } from 'src/models/interface';


@Controller('api/tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly gateway: TasksGateway,
    private readonly notifications: NotificationsService,
  ) { }



  /** ✅ Lister les tâches avec filtres, tri et pagination */
  @UseGuards(FirebaseAuthGuard)
  @Get()
  async list(
    @Query() filters: any,
    @Query('limit') limit?: number,
    @Query('orderBy') orderBy: string = 'createdAt',
    @Query('direction') direction: 'asc' | 'desc' = 'asc',
  ) {
    try {
      const data = await this.tasks.list(filters, { limit, orderBy, direction });
      return { status: 200, data };
    } catch (err: any) {
      throw new HttpException(
        { status: 500, error: err.message || 'Internal Server Error' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ✅ Filtrer par champ */
  @UseGuards(FirebaseAuthGuard)
  @Post('by-field')
  async findByField(@Body() payload: { field: string; value: any }) {
    if (!payload?.field || payload.value === undefined) {
      throw new BadRequestException('Champ et valeur requis');
    }
    try {
      const data = await this.tasks.listByField(payload.field, payload.value);
      return { status: 200, data };
    } catch (err: any) {
      throw new HttpException(
        { status: 500, error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ✅ Récupérer une tâche par field & value */
  @UseGuards(FirebaseAuthGuard)
  @Post('bulk-get')
  async buildGet(@Body() payload: { field: string; value: any }) {
    if (!payload?.field || payload.value === undefined) {
      throw new BadRequestException('Champ et valeur requis');
    }
    try {
      const task = await this.tasks.buildGet(payload.field, payload.value);
      return { status: 200, data: task };
    } catch (err: any) {
      throw err instanceof NotFoundException
        ? err
        : new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** ✅ Créer une nouvelle tâche */
  @UseGuards(FirebaseAuthGuard)
  @Post()
  async create(@Body() payload: any[]) {
    // if (!payload?.title) throw new BadRequestException('Le champ "title" est requis');

    try {
      const task = await this.tasks.create(payload);
      this.gateway.broadcastTaskUpdate('created', task);

      await this.notifications.sendToTopic(
        'tasks',
        'Nouvelle tâche',
        `La tâche "${task.title || task.id}" a été ajoutée.`,
        { taskId: task.id },
      );

      return { status: 200, data: task };
    } catch (err: any) {
      throw new HttpException(
        { status: 400, error: err.message || 'Invalid payload' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ✅ Créer multiple nouvelle tâche */
  @UseGuards(FirebaseAuthGuard)
  @Post('bulk-create')
  async bulkCreate(@Body() payload: any[]) {
    // if (!payload?.title) throw new BadRequestException('Le champ "title" est requis');

    try {
      const task = await this.tasks.bulkCreate(payload);
      this.gateway.broadcastTaskUpdate('created', task);

      for (const task of payload) {
        await this.notifications.sendToTopic(
          'tasks',
          'Nouvelle tâche',
          `La tâche "${task.title || task.id}" a été ajoutée.`,
          { taskId: task.id },
        );
      }

      return { status: 200, data: task };
    } catch (err: any) {
      throw new HttpException(
        { status: 400, error: err.message || 'Invalid payload' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ✅ Mettre à jour multiple tâche */
  @UseGuards(FirebaseAuthGuard)
  @Put('bulk-update')
  async bulkUpdate(@Body() payload: any[]) {
    try {
      const updated = await this.tasks.bulkUpdate(payload);
      this.gateway.broadcastTaskUpdate('updated', updated);
      for (const task of payload) {

        await this.notifications.sendToTopic(
          'tasks',
          'Mise à jour',
          `La tâche "${task.title || task.id}" a été mise à jour.`,
          { taskId: task.id },
        );
      }

      return { status: 200, data: updated };
    } catch (err: any) {
      throw err instanceof NotFoundException
        ? err
        : new HttpException(
          { status: 400, error: err.message || 'Invalid payload' },
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  /** ✅ Supprimer une tâche */
  @UseGuards(FirebaseAuthGuard)
  @Post('bulk-delete')
  async bulkDelete(@Body() payload: string[]) {
    if (!payload || payload.length == 0) throw new BadRequestException('ID requis');
    try {
      await this.tasks.bulkDelete(payload);

      this.gateway.broadcastTaskUpdate('bulkDelete', payload);

      for (const id of payload) {
        await this.notifications.sendToTopic(
          'tasks',
          'Suppression',
          `La tâche ${id} a été supprimée.`,
          { taskId: id },
        );
      }

      return { status: 200, message: 'Deleted successfully' };
    } catch (err: any) {
      throw err instanceof NotFoundException
        ? err
        : new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** ✅ Rechercher une tâche par mot-clé */
  @UseGuards(FirebaseAuthGuard)
  @Get('search/:field/:keyword')
  async search(@Param('field') field: string, @Param('keyword') keyword: string) {
    if (!field || !keyword) throw new BadRequestException('Champ et mot-clé requis');
    try {
      const data = await this.tasks.search(field, keyword);
      return { status: 200, data };
    } catch (err: any) {
      throw new HttpException(
        { status: 500, error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ✅ Compter toutes les tâches */
  @UseGuards(FirebaseAuthGuard)
  @Get('stats/count')
  async count() {
    try {
      const total = await this.tasks.count();
      return { status: 200, total };
    } catch (err: any) {
      throw new HttpException(
        { status: 500, error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ✅ Compter les tâches par champ */
  @UseGuards(FirebaseAuthGuard)
  @Get('stats/count/:field/:value')
  async countByField(@Param('field') field: string, @Param('value') value: string) {
    if (!field || !value) throw new BadRequestException('Champ et valeur requis');
    try {
      const total = await this.tasks.countByField(field, value);
      return { status: 200, total };
    } catch (err: any) {
      throw new HttpException(
        { status: 500, error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ✅ Vérifier si une tâche existe */
  @UseGuards(FirebaseAuthGuard)
  @Get('exists/:id')
  async exists(@Param('id') id: string) {
    if (!id) throw new BadRequestException('ID requis');
    try {
      const exists = await this.tasks.exists(id);
      return { status: 200, exists };
    } catch (err: any) {
      throw new HttpException(
        { status: 500, error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ✅ Vérifier les tâches en retard */
  @UseGuards(FirebaseAuthGuard)
  @Get('stats/late')
  async lateTasks() {
    try {
      await this.tasks.checkLateTasks();
      return { status: 200, message: 'Late tasks checked' };
    } catch (err: any) {
      throw new HttpException(
        { status: 500, error: err.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ✅ Healthcheck */
  @Get('health')
  async healthCheck() {
    return { status: 200, message: 'Tasks API is healthy' };
  }






  @UseGuards(FirebaseAuthGuard)
  @Get(':taskId/comments')
  async getComments(@Param('taskId') taskId: string) {
    if (!taskId) throw new BadRequestException('ID requis');

    try {
      const comments = await this.tasks.getComments(taskId);
      return { status: 200, data: comments };
    } catch (err: any) {
      return { status: 500, data: err.message };
    }
  }

  // { taskId: string, commentId: string, by: string, msg: any, at: number }
  // {taskId: string, commentId: string}
  @UseGuards(FirebaseAuthGuard)
  @Post(':taskId/comments')
  async addComment(@Param('taskId') taskId: string, @Body() body: Comments) {

    if (!taskId) throw new BadRequestException('ID requis');
    const { by, msg, at } = body;

    if (!by || !msg.trim() || !at) throw new BadRequestException('TaskId, by et text requis');

    try {
      const comment = await this.tasks.addComment({ taskId, by, msg: msg.trim(), at });
      return { status: 200, data: comment };
    } catch (err: any) {
      return { status: 500, data: err.message };
    }
  }

  /**
   * Update a comment (by + timestamp)
   */
  @UseGuards(FirebaseAuthGuard)
  @Put(':taskId/comments/:commentId')
  async updateComment(@Param('taskId') taskId: string, @Param('commentId') commentId: string, @Body() body: Comments) {
    if (!taskId) throw new BadRequestException('ID requis');
    const { by, msg, at } = body;

    if (!by || !msg.trim() || !at) throw new BadRequestException('TaskId, by et text requis');

    try {
      const updated = await this.tasks.updateComment({ taskId, commentId, by, msg: msg.trim(), at });
      return { status: 200, message: 'Comment updated', data: updated };
    } catch (err: any) {
      throw new HttpException(err.message || 'Internal server error', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete a comment (by + timestamp)
   */
  @UseGuards(FirebaseAuthGuard)
  @Delete(':taskId/comments/:commentId')
  async deleteComment(@Param('taskId') taskId: string, @Param('commentId') commentId: string) {
    try {
    if (!taskId || !commentId) throw new BadRequestException('ID requis');
      const deleted = await this.tasks.deleteComment({ taskId, commentId });
      return { status: 200, message: 'Comment deleted', data: deleted };
    } catch (err: any) {
      throw new HttpException(err.message || 'Internal server error', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }





  /** ✅ Récupérer une tâche par ID */
  @UseGuards(FirebaseAuthGuard)
  @Get(':id')
  async get(@Param('id') id: string) {
    if (!id) throw new BadRequestException('ID requis');
    try {
      const task = await this.tasks.get(id);
      return { status: 200, data: task };
    } catch (err: any) {
      throw err instanceof NotFoundException
        ? err
        : new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  /** ✅ Mettre à jour une tâche */
  @UseGuards(FirebaseAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() payload: any) {
    if (!id) throw new BadRequestException('ID requis');
    try {
      const updated = await this.tasks.update(id, payload);
      this.gateway.broadcastTaskUpdate('updated', updated);

      await this.notifications.sendToTopic(
        'tasks',
        'Mise à jour',
        `La tâche "${updated.title || updated.id}" a été mise à jour.`,
        { taskId: updated.id },
      );

      return { status: 200, data: updated };
    } catch (err: any) {
      throw err instanceof NotFoundException
        ? err
        : new HttpException(
          { status: 400, error: err.message || 'Invalid payload' },
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  /** ✅ Supprimer une tâche */
  @UseGuards(FirebaseAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    if (!id) throw new BadRequestException('ID requis');
    try {
      await this.tasks.delete(id);
      this.gateway.broadcastTaskUpdate('deleted', { id });

      await this.notifications.sendToTopic(
        'tasks',
        'Suppression',
        `La tâche ${id} a été supprimée.`,
        { taskId: id },
      );

      return { status: 200, message: 'Deleted successfully' };
    } catch (err: any) {
      throw err instanceof NotFoundException
        ? err
        : new HttpException({ status: 500, error: err.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}

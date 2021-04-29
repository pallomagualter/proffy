import { Request, Response } from 'express';

import db from '../database/connection';
import convertHourToMinutes from '../utils/convertHourToMinutes';

//para definir o tipo que será utilizado no map
interface ScheduleItem {
  week_day: number;
  from: string;
  to: string;
}

export default class ClassesController {
  async index(request: Request, response: Response) {
    const filters = request.query;

    const subject = filters.subject as string;
    const week_day = filters.week_day as string;
    const time = filters.time as string;

    if (!filters.week_day || !filters.subject || !filters.time) {
      return response.status(400).json({
        error: 'Missing filters to search classes'
      });
    }

    const timeInMinutes = convertHourToMinutes(time);

    const classes = await db('classes')
      .whereExists(function() {
        this.select('class_schedule.*') //olhar * (todas) as aulas
          .from('class_schedule') //de
          .whereRaw('`class_schedule`.`class_id` = `classes`.`id`') //id da aula sendo igual o id passado
          .whereRaw('`class_schedule`.`week_day` = ??', [Number(week_day)]) //verificação do dia da semana
          .whereRaw('`class_schedule`.`from` <= ??', [timeInMinutes]) //verificação horário disponível (antes ou igual ao horário solicitado)
          .whereRaw('`class_schedule`.`to` > ??', [timeInMinutes]) //horário tem que ser menor, pois se ele para neste horário não poderá agendar aula
      })
      .where('classes.subject', '=', subject) //verificação matéria
      .join('users', 'classes.user_id', '=', 'users.id') //verificação usuário
      .select(['classes.*', 'users.*']); //aulas por usuário

    return response.json(classes);
  }

  async create(request: Request, response: Response) {
    const {
      name,
      avatar,
      whatsapp,
      bio,
      subject,
      cost,
      schedule
    } = request.body;

    const trx = await db.transaction();
  
    try {
      const insertedUsersIds = await trx('users').insert({
        name,
        avatar,
        whatsapp,
        bio,
      });
    
      const user_id = insertedUsersIds[0];
    
      const insertedClassesIds = await trx('classes').insert({
        subject,
        cost,
        user_id,
      });
    
      const class_id = insertedClassesIds[0];
    
      /**
       * Irá mapear(percorrer) cada item do schedule e transformar e retornar um novo objeto
       * chamando a função de conversão de hora para minutos
       */
      const classSchedule = schedule.map((scheduleItem: ScheduleItem) => {
        return {
          class_id,
          week_day: scheduleItem.week_day,
          from: convertHourToMinutes(scheduleItem.from),
          to: convertHourToMinutes(scheduleItem.to),
        };
      })
    
      await trx('class_schedule').insert(classSchedule);
    
      await trx.commit();
    
      return response.status(201).send();
    } catch (err) {
      console.log(err);

      await trx.rollback(); //desfazer qual ação que aconteceu durante esse processo
  
      return response.status(400).json({
        error: 'Unexpected error while creating new class'
      })
    }
  }
}
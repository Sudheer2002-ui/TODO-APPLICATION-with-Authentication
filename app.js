const express = require('express')
const app = express()
const {format, isValid} = require('date-fns')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, 'todoApplication.db')
let db = null
app.use(express.json())
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
}

initializeDBAndServer()

const statusd = status => ['TO DO', 'IN PROGRESS', 'DONE'].includes(status)
const priorited = priority => ['HIGH', 'LOW', 'MEDIUM'].includes(priority)
const categoried = category => ['HOME', 'LEARNING', 'WORK'].includes(category)

const dueDated = dueDate => {
  const date = new Date(dueDate)
  return isValid(date)
}

app.get('/todos/', async (request, response) => {
  const {status, priority, search_q, category, dueDate} = request.query
  let query =
    'SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo WHERE 1=1'

  if (status !== undefined) {
    if (statusd(status)) {
      query += ` AND status = '${status}'`
    } else {
      return response.status(400).send('Invalid Todo Status')
    }
  }

  if (priority !== undefined) {
    if (priorited(priority)) {
      query += ` AND priority = '${priority}'`
    } else {
      return response.status(400).send('Invalid Todo Priority')
    }
  }

  if (category !== undefined) {
    if (categoried(category)) {
      query += ` AND category = '${category}'`
    } else {
      return response.status(400).send('Invalid Todo Category')
    }
  }

  if (dueDate !== undefined) {
    const date = new Date(dueDate)
    if (isValid(date)) {
      const formattedDate = format(date, 'yyyy-MM-dd')
      query += ` AND due_date = '${formattedDate}'`
    } else {
      return response.status(400).send('Invalid Due Date')
    }
  }

  if (search_q !== undefined) {
    query += ` AND todo LIKE '%${search_q}%'`
  }

  const todos = await db.all(query)
  response.send(todos)
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const query = `SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo WHERE id = ${todoId}`
  const specificToDo = await db.get(query)
  response.send(specificToDo)
})

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  if (!statusd(status)) {
    return response.status(400).send('Invalid Todo Status')
  }
  if (!priorited(priority)) {
    return response.status(400).send('Invalid Todo Priority')
  }
  if (!categoried(category)) {
    return response.status(400).send('Invalid Todo Category')
  }
  if (!dueDated(dueDate)) {
    return response.status(400).send('Invalid Due Date')
  }

  const query = `INSERT INTO todo (id, todo, priority, status, category, due_date) VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}')`
  await db.run(query)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const {status, priority, todo, category, dueDate} = request.body

  if (status !== undefined && !statusd(status)) {
    return response.status(400).send('Invalid Todo Status')
  }
  if (priority !== undefined && !priorited(priority)) {
    return response.status(400).send('Invalid Todo Priority')
  }
  if (category !== undefined && !categoried(category)) {
    return response.status(400).send('Invalid Todo Category')
  }
  if (dueDate !== undefined && !dueDated(dueDate)) {
    return response.status(400).send('Invalid Due Date')
  }

  let query = 'UPDATE todo SET'
  const updates = []
  if (status !== undefined) updates.push(`status = '${status}'`)
  if (priority !== undefined) updates.push(`priority = '${priority}'`)
  if (todo !== undefined) updates.push(`todo = '${todo}'`)
  if (category !== undefined) updates.push(`category = '${category}'`)
  if (dueDate !== undefined) updates.push(`due_date = '${dueDate}'`)

  if (updates.length === 0) {
    return response.status(400).send('Nothing to update')
  }

  query += ` ${updates.join(', ')} WHERE id = ${todoId}`
  await db.run(query)
  response.send('Todo Updated')
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const query = `DELETE FROM todo WHERE id = ${todoId}`
  await db.run(query)
  response.send('Todo Deleted')
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const dated = new Date(date)
  if (isValid(dated)) {
    const formattedDate = format(dated, 'yyyy-MM-dd')
    const query = `SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo WHERE due_date = '${formattedDate}'`
    const dateArray = await db.all(query)
    response.send(dateArray)
  } else {
    response.status(400).send('Invalid Due Date')
  }
})

module.exports = app

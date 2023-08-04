const connectDB = require('./db')
connectDB()


var cors = require('cors')

const express = require('express')
const app = express()
const port = 5000

app.use(cors({
    origin: '*'
  }));
app.use(express.json()) // Helps use req variables in app.get
app.set('port', process. env. PORT || port);


//Available Routes
app.use('/api/auth',require('./routes/auth'))
// app.use('/api/notes',require('./routes/note'))


app.get('/', (req, res) => {
    console.log(req.body)
    res.send('ECom API 1!')
})
//
app.listen(port, () => {
    console.log(`Example app listening at  http://localhost:`,port)
})


// const server = app.listen(0, () => console.log(`Server started on port :`,server.address().port));
// // Export the Express API
// module.exports = app
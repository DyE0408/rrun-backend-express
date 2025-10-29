import express from 'express'
import authV1 from './controllers/v1/auth.js';
import usersV1 from './controllers/v1/users.js';
import mongoose from './db.js';
import groupsV1 from './controllers/v1/groups.js';
import expenseV1 from './controllers/v1/expenses.js';
//import utilsRoutes from "./controllers/v1/admin.js";


const app = express()

app.use(express.json())

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`)
    if (req.body) {
        console.log(`${JSON.stringify(req.body, null, 2)}`)
    }
    next()
})

const PORT = 3030
//app.use("/api/v1/admin", utilsRoutes);
app.use('/api/v1/auth', authV1);
app.use('/api/v1/users', usersV1);
app.use('/api/v1/groups', groupsV1);
app.use('/api/v1/expenses', expenseV1);



app.get("/health", (req, res) => {
    const estadoConexion = mongoose.connection.readyState

    let dbEstado = 'desconocido';
    const estados = ["desconectado", "conectado", "conectando", "desconectando"];

    res.json({ code: 'OK', message: 'Server is running', time: process.uptime(), estado: estados[estadoConexion] })

})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
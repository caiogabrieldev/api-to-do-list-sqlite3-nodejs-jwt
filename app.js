const express=require('express')
const cors=require('cors')
const bcrypt=require('bcryptjs')
const jwt= require('jsonwebtoken')
require('dotenv').config()
const {Sequelize, DataTypes, where} = require('sequelize')

const app=express()
const JWT_SECRET = process.env.JWT_SECRET
const PORT=3090

app.use(express.json())
app.use(cors())

const conexaoComBD=new Sequelize({
    dialect: 'sqlite',
    storage: 'To-do-List-BD.sqlite'
})

const TabelaUsers=conexaoComBD.define('Usuarios', {
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        unique: true,
        autoIncrement: true
    },
    email:{
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    senha:{
        type: DataTypes.STRING(255),
        allowNull: false,
    }
})
const TabelaTasks=conexaoComBD.define('Tasks', {
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        unique: true,
        autoIncrement: true
    },
    userId:{
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    titulo:{
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    descricao:{
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    status:{
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    dataCriacao:{
        type: DataTypes.STRING(255),
        allowNull: false,
    }
})

async function sincronizarBD(){
    try {
        await conexaoComBD.sync()
    } catch (error) {
        console.log("Erro ao sincronizar");
    }
}
sincronizarBD()

app.listen(PORT, ()=>{
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
})

app.post('/registrar', async (req,res)=>{
    const {email, senha}=req.body
    const existe= await TabelaUsers.findAll({where: {email:email}})
  
    if(existe.length!=0){
        return res.status(400).json({message: 'O usuário já existe'})
    }

    const hashed= await bcrypt.hash(senha, 8)
    const user={
        email:email,
        senha:hashed
    }
    await TabelaUsers.create(user)
    await res.status(200).json({message: "Usuário criado com sucesso!"})
})

app.post('/login', async (req,res)=>{
    const {email,senha}=req.body

    const user=await TabelaUsers.findAll({where:{email:email}})
    
    if(!user.length===0){
        return res.status(404).json({message: "Email não cadastrado"})
    }
    const compararSenha=await bcrypt.compare(senha, user[0].senha)
    if(!compararSenha){
        return res.status(400).json({message: "Credenciais inválidas"})
    }
    const token=jwt.sign({id:user[0].id}, JWT_SECRET,{expiresIn:"1h"})
    return res.status(200).json({token})

})

function authMiddeleware(req,res,next) {
    const authHeader=req.headers.authorization
    if(!authHeader){
        return res.status(400).json({error: 'Token ausente'})

    }
    const token=authHeader.split(' ')[1]
    try {
        const decoded=jwt.verify(token, JWT_SECRET)
        req.id=decoded.id
        next()
    } catch (error) {
        return res.status(400).json({message: "Token inválido"})
    }
}
app.post('/criar-tarefa',authMiddeleware,async (req,res)=>{
    const tarefa=req.body
    tarefa.userId=req.id
   
    try {
        await TabelaTasks.create(tarefa)
        res.status(200).json({message: "Tarefa criada com sucesso"})
    } catch (e) {
        console.log(error);
        res.status(400).json({message: "Erro ao criar tarefa"})
    }
})
app.put('/atualizar-tarefa/:titulo',authMiddeleware,async (req,res)=>{
    const tarefa=req.body
  
    try {
        await TabelaTasks.update(tarefa,{where:{titulo:req.params.titulo}})
        res.status(200).json({message: "Tarefa atualizada com sucesso"})
    } catch (e) {
        console.log(e);
        res.status(400).json({message: "Erro ao atualizar tarefa"})
    }
})
app.delete('/deletar-tarefa/:titulo',authMiddeleware,async (req,res)=>{
    
    try {
        await TabelaTasks.destroy({where:{titulo:req.params.titulo}})
        res.status(200).json({message: "Tarefa excluida com sucesso"})
    } catch (e) {
        console.log(e);
        res.status(400).json({message: "Erro ao excluir tarefa"})
    }
})
app.get('/show-tarefa',authMiddeleware,async (req,res)=>{
    
    try {
        const tarefas= await TabelaTasks.findAll({where:{userId:req.id}})
        res.status(200).json({tarefas})
    } catch (e) {
        console.log(e);
        res.status(400).json({message: "Erro ao obter tarefa"})
    }
})




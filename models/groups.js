import GroupsSchema from '../schemas/groups.js';

// Crear un nuevo grupo
const saveGroup = (group, callback) => {
  return GroupsSchema.saveGroup(group, callback);
};
//Editar un grupo
const editGroup = (groupId, updateData, callback) => {
  return GroupsSchema.editGroup(groupId, updateData, callback);
};
// Obtener todos los grupos
const getAllGroups = (id, callback) => {
  return GroupsSchema.findAllGroups(id, callback);
};

// Obtener todos miembros
const getAllMembers = (groupId, callback) => {
  return GroupsSchema.findAllMembers(groupId, callback);
};

// Obtener un grupo por ID
const getGroupById = (id, callback) => {
  return GroupsSchema.findGroupById(id, callback);
};

// Agregar un gasto a un grupo
const addExpense = (groupId, expenseData, callback) => {
  return GroupsSchema.addExpense(groupId, expenseData, callback);
};

// Eliminar un gasto
const deleteExpense = (groupId, expenseId, callback) => {
  return GroupsSchema.deleteExpense(groupId, expenseId, callback);
};

// Agregar un participante a un gasto
const addParticipant = (groupId, expenseId, participantData, callback) => {
  return GroupsSchema.addParticipant(groupId, expenseId, participantData, callback);
};

// Eliminar un participante de un gasto
const deleteParticipant = (groupId, expenseId, participantId, isDeleted, callback) => {
  return GroupsSchema.deleteParticipant(groupId, expenseId, participantId, isDeleted, callback);
};
const updatePayExpense = (groupId, expenseId, participantId, paid, callback) => {
  return GroupsSchema.updatePayExpense(groupId, expenseId, participantId, paid, callback);
};

// Añadir miembro a un grupo por groupId
const addMember = (groupId, userId, callback) => {
  return GroupsSchema.addMember(groupId, userId, callback);
};
// Eliminar un miembro a un grupo por groupId
const deleteMember = (groupId, memberId, isDeleted, callback) => {
  return GroupsSchema.deleteMember(groupId, memberId, isDeleted, callback);
};
// Eliminar un grupo
const deleteGroup = (groupId, userId, callback)=>{
  return GroupsSchema.deleteGroup(groupId, userId, callback);
}

const sendNotification =(groupId, expense, updatedGroup, callback)=>{
return GroupsSchema.sendNotification(groupId, expense, updatedGroup, callback)
}


const sendExpenseNotification =(groupId, expense, updatedGroup, type,  callback)=>{
return GroupsSchema.sendExpenseNotification(groupId, expense, updatedGroup, type, callback)
}

//===================================================Nuevos

const getExpenseById = (expenseId, callback)=>{
  return GroupsSchema.findExpenseById(expenseId, callback)
}

const updateExpense = (groupId, expenseId, updateData, callback) => {
  return GroupsSchema.updateExpense(groupId, expenseId, updateData, callback);
};

const sendReminder = (groupId, expenseId,callback )=>{
  return GroupsSchema.sendReminder(groupId, expenseId,callback)
}

export default {
  sendReminder,
  updateExpense,
  getExpenseById,
  sendExpenseNotification,
  sendNotification,
  saveGroup,
  editGroup,
  getAllGroups,
  getAllMembers,
  getGroupById,
  addExpense,
  deleteExpense,
  addParticipant,
  deleteParticipant,
  updatePayExpense,
  addMember,
  deleteMember,
  deleteGroup
};
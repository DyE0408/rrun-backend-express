import UsersSchema from '../schemas/users.js';

const getAllUsers = (callback) => {
    return UsersSchema.findAllUsers(callback);
}


const saveUser = (user, callback) => {
    return UsersSchema.saveUser(user, callback);
}
const getUserById = (id, callback) => {
    return UsersSchema.findUserById(id, callback)

}

const updateUser = (id, user, callback) => {
    return UsersSchema.updateUser(id, user, callback)

}

const getUserByEmail = (email, callback) => {
    return UsersSchema.findUserByEmail(email, callback)

}

const findUserByEmailWithoutPass = (email, callback) => {
    return UsersSchema.findUserByEmailWithoutPass(email, callback)

}
const getUserByEmailWithoutPassContacts = (email, callback) => {
    return UsersSchema.findUserByEmailWithoutPassContacts(email, callback);
}

const deleteUser = (id, callback) => {
    return UsersSchema.deleteUser(id, callback);
}

const addContact = (userId, contactId, callback) => {
    return UsersSchema.addContact(userId, contactId, callback);
}


const removeContact = (userId, contactId, callback) => {
    return UsersSchema.removeContact(userId, contactId, callback);
}
const getContacts = (userId, callback) => {
    return UsersSchema.getContacts(userId, callback);
}

const getAllContacts = (userId, callback) => {
    return UsersSchema.findAllContacts(userId, callback);
}


const loginUser = (email, password, callback) => {
    return User.findUserByEmail(email, (err, user) => {
        if (err) {
            return callback(err)
        }
        if (!user) {
            return callback(null, null)
        }
        if (user.password !== password) {
            return callback(null, null)
        }
        return callback(null, user)
    })
}


const updateFcmToken = (userId, fcmToken, callback) => {
    return UsersSchema.updateFcmToken(userId, fcmToken, callback);
}

const updatePassword = (userId, oldPass, newPass, callback) => {
    return UsersSchema.updatePassword(userId, oldPass, newPass, callback);
}

const addContactAndMember = (userId, contactId, groupId,callback)=>{
    return UsersSchema.addContactAndMember(userId, contactId, groupId,callback)
}


export default { addContactAndMember, getAllContacts, updatePassword, saveUser, updateFcmToken, getAllUsers, getUserById, getUserByEmail, findUserByEmailWithoutPass, getUserByEmailWithoutPassContacts, updateUser, deleteUser, loginUser, addContact, removeContact, getContacts }
const mongoose = require('mongoose');
const config = require('./index')
const log4js = require("./../utils/log4j")

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(config.URL)

  await mongoose.connect('mongodb+srv://leave-app-db:leaveapp123@leave-app.h7hgjgd.mongodb.net/test?retryWrites=true&w=majority');
  
}

const db = mongoose.connection

db.on('error',()=> {
    log4js.error('***database connect FAIL***')
})

db.on('open',()=> {
    log4js.info('***database connect SUCCSS***')
})


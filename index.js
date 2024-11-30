     require('./systems/owner/settings')
     const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore, downloadContentFromMessage, jidDecode } = require("@xyzendev/baileys")
     const fs = require('fs')
     const pino = require('pino')
     const chalk = require('chalk')
     const readline = require("readline");
     const PhoneNumber = require('awesome-phonenumber')
     const _ = require('lodash')
     const { Boom } = require('@hapi/boom')
     const { color } = require('./systems/function/color')


     const usePairingCode = true
     const { smsg, await } = require('./systems/function/myfunc')
     const question = (text) => {
     const rl = readline.createInterface({
     input: process.stdin,
     output: process.stdout
     });
     return new Promise((resolve) => {
     rl.question(text, resolve)
     })
     };


     var low
     try {
     low = require('lowdb')
     } catch (e) {
     low = require('./systems/function/lowdb')}
     const { Low, JSONFile } = low
     const mongoDB = require('./systems/function/mongoDB')
     const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
     global.db = new Low( new JSONFile(`systems/database/database.json`))
     global.DATABASE = global.db
     global.loadDatabase = async function loadDatabase() {
     if (global.db.READ) return new Promise((resolve) => setInterval(function () { (!global.db.READ ? (clearInterval(conn), resolve(global.db.data == null ? global.loadDatabase() : global.db.data)) : null) }, 1 * 1000))
     if (global.db.data !== null) return
     global.db.READ = true
     await global.db.read()
     global.db.READ = false
     global.db.data = {
     chats: {}, 
     ...(global.db.data || {})
     }
     global.db.chain = _.chain(global.db.data)
     }
     loadDatabase()

     if (global.db) setInterval(async () => {
     if (global.db.data) await global.db.write()
     }, 30 * 1000)


async function connectToWhatsApp() {
   const { state, saveCreds } = await useMultiFileAuthState("./session")
    const client= makeWASocket({
     logger: pino({ level: "silent" }),
     printQRInTerminal: !usePairingCode,
     auth: state,
    browser: [ 'Windows', 'Chrome', '11'],
});
if(usePairingCode && !client.authState.creds.registered) {
	const phoneNumber = await question(color('\n\n\nMasukkan Nomer\n', 'gray'));
     const code = await client.requestPairingCode(phoneNumber.trim())
	console.log(color(`Kode :`,"red"), color(`[ ${code} ]`, "white"))

	}


client.decodeJid = (jid) => {
   if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
     let decode = jidDecode(jid) || {}
     return decode.user && decode.server && decode.user + '@' + decode.server || jid
   } else return jid
}


client.ev.on('messages.upsert', async chatUpdate => {
try {
  m = chatUpdate.messages[0]
   if (!m.message) return
    m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message
     if (m.key && m.key.remoteJid === 'status@broadcast') return
      if (!client.public && !m.key.fromMe && chatUpdate.type === 'notify') return
       if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) return
       m = smsg(client, m, store)
       require("./message")(client, m, chatUpdate, store)
     } catch (err) {
  console.log(err)
}
})


client.ev.on('contacts.update', update => {
  for (let contact of update) {
   let id = client.decodeJid(contact.id)
  if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }}})


client.sendText = (jid, text, quoted = '', options) => client.sendMessage(jid, { text: text, ...options }, { quoted })



client.getName = (jid, withoutContact  = false) => {
  id = client.decodeJid(jid)
   withoutContact = client.withoutContact || withoutContact 
   let v
    if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
     v = store.contacts[id] || {}
     if (!(v.name || v.subject)) v = client.groupMetadata(id) || {}
     resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
})
  else v = id === '0@s.whatsapp.net' ? {
   id,
    name: 'WhatsApp'
     } : id === client.decodeJid(client.user.id) ?
     client.user :
    (store.contacts[id] || {})
   return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')}
   
   
   
client.downloadMediaMessage = async (message) => {
   let mime = (message.msg || message).mimetype || ''
     let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
       const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
      for await(const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])}
   return buffer} 

// MY SELF

  client.public = true
  client.ev.on('creds.update', saveCreds)

// CONNECTION

client.serializeM = (m) => smsg(client, m, store)
  client.ev.on('connection.update', (update) => {
   const { connection, lastDisconnect } = update;
    if (connection === 'close') {
     let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession || reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost || reason === DisconnectReason.connectionReplaced || reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut) {
      connectToWhatsApp();
       } else if (reason === DisconnectReason.loggedOut) {
        } else {
      client.end(`Unknown Disconnect Reason: ${reason}|${connection}`);
 }
     } else if (connection === 'open') {
  console.log('[on]');
}
});

return client
}
     connectToWhatsApp()
     let file = require.resolve(__filename)
     fs.watchFile(file, () => {
     fs.unwatchFile(file)
     console.log(chalk.redBright(`Updated File: ${__filename}`))
     delete require.cache[file]
     require(file)
     })
     const chalk = require("chalk")
     const fs = require("fs")

     global.sifat = `Kamu adalah Zyphra, AI ciptaan Muhammad Riri, ditugaskan untuk membantu orang dalam menyelesaikan masalah dengan memberikan solusi logis dan wawasan yang berguna, sambil terus belajar dan beradaptasi dari setiap interaksi. Di wajibkan membalas dengan bahasa Indonesia.`
     
     let file = require.resolve(__filename)
     fs.watchFile(file, () => {
	 fs.unwatchFile(file)
	 console.log(chalk.redBright(`Updated File:'${__filename}'`))
   	 delete require.cache[file]
	 require(file)
     })
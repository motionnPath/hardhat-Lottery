// always he same 

const {run} = require("hardhat");

const verify =async function (contractAddress, args ) {
    console.log('verifying contract ...');
    try{
        await run("verify:verify",{
            address:contractAddress,
            constructorArguments:args
        })
    }catch(e) {
        if(e.message.toLowerCase().includes("already verified")){
            console.log(" contract is already verified")
        }else {
            console.log(e)
        }
    }
}

module.exports = {verify}
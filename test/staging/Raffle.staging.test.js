const {developementChains,networkConfig} = require("../../helper-hardhat-config");
const {network, getNamedAccounts, deployments, ethers} = require("hardhat");
const { assert, expect } = require("chai");




developementChains.includes(network.name)? describe.skip :describe("Raffle unit tests",function(){

        let raffle, raffleEntrancefee,deployer;
        beforeEach(async function(){
            deployer  = (await getNamedAccounts()).deployer
            //await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle",deployer);
            raffleEntrancefee = await raffle.getEntranceFee()
            
        })

        describe("fulfillRandomWords", function(){

            it("works with live chainlink keepers and chainlink VRF, we get a random winner",
            async function(){
                console.log("Setting up test...")
                const startingTimeStamp = raffle.getLatestTimeStamp()
                const accounts = await ethers.getSigners()

                console.log("Setting up Listener...")
                await new Promise(async (resolve,reject)=>{
                    raffle.once("WinnerPicked",async()=>{
                        console.log("winnerPicked event have been triggered !!")
                        resolve()
                        try{
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const winnerEndingBalance = await accounts[0].getBalance()
                            const endingTimeStamp = await raffle.getLatestTimeStamp()

                            assert.equal(recentWinner.toString(),accounts[0].address)
                            assert.equal(raffleState,"0")
                            assert.equal(winnerEndingBalance.toHexString(),
                            winnerStartingBalance.add(raffleEntrancefee).toString())
                            assert(endingTimeStamp>startingTimeStamp)
                            resolve()
                        }catch(e){
                            console.log(e)
                            reject(e)
                        }
                    })
                    console.log("Entering Raffle...")
                    await raffle.enterRaffle({value:raffleEntrancefee})
                    const winnerStartingBalance = await accounts[0].getBalance()
                })
            })
        })
})